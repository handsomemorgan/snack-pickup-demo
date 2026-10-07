import { SEED_PRODUCTS } from "./menu";
import { orderQuery, summarizeOrders } from "./operations";
import { pickupWindow, validPickup, pickupBucket, kitchenReceipt, contactPhone, categoryOrder } from "./pickup";
// Public, browser-only simulation. These demonstration keys are not credentials.
type Row = Record<string, any>;
type Shop = { merchant: Row; products: Row[]; orders: Row[]; events: Row[]; key: string };
type State = { version: 1; shops: Record<string, Shop>; merchantExampleAdded?: boolean };
const STORE = "snack:public-demo:v1";
const ADMIN_KEY = "demo-admin";
const stamp = (at: number) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(at);
function makeShop(id: string, name: string, products: Row[] = [], expires = Date.now() + 30 * 86400000): Shop {
  return { key: id === "template-shop" ? "demo-shop" : id === "demo-stall" ? "demo-stall-shop" : "demo-shop-" + crypto.randomUUID(), merchant: { id, name, subtitle: "校园小吃街 · 预约自取", description: "提前选好，按约定时间取餐。", accent: "#ea531a", contact_phone: "0571-0000-0000", categoryOrder: [], hero_image: null, license_expires: expires, suspended: false, printer_online: true, capacity: 6, last_heartbeat: null }, products: products.map(p => ({ ...p, merchant_id: id, active: 1, updated_at: Date.now(), description: p.description || "", image_data: p.image_data || null })), orders: [], events: [] };
}
function initial(): State {
  return { version: 1, shops: { "demo-stall": makeShop("demo-stall", "东北烤冷面（示例店）", SEED_PRODUCTS), "template-shop": makeShop("template-shop", "独立店家模板", [{ id: "template-main", name: "招牌烤冷面（示例）", category: "热食", price: 900, sort: 0 }, { id: "template-drink", name: "冰豆浆（示例）", category: "饮品", price: 350, sort: 1 }]) } };
}
function read(): State {
  let state: State;
  try { state = JSON.parse(localStorage.getItem(STORE) || "null"); if (state?.version !== 1 || !state.shops) state = initial(); } catch { state = initial(); }
  for (const shop of Object.values(state.shops)) { shop.merchant.contact_phone ??= "0571-0000-0000"; shop.merchant.categoryOrder ??= []; }
  // Upgrade legacy shared demo keys without discarding browser orders or menus.
  for (const [id, shop] of Object.entries(state.shops)) if (id !== "template-shop" && shop.key === "demo-shop") shop.key = id === "demo-stall" ? "demo-stall-shop" : "demo-shop-" + id;
  if (process.env.NEXT_PUBLIC_DEMO_EDITION === "merchant" && !state.merchantExampleAdded) {
    const shop=state.shops["demo-stall"];
    if(shop&&!shop.orders.length){const at=pickupWindow().earliest+23*60000;const example:Row={id:crypto.randomUUID(),merchant_id:"demo-stall",accessToken:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),pickup_code:"DEMO01",pickup_at:at,quantity:1,items:[{id:"demo-example-main",name:"招牌烤冷面",category:"基础款",price:900,quantity:1}],total:900,spice:"不辣",note:"不加洋葱",alias:"示例同学",status:"paid",payment_state:"merchant_confirmed",created_at:Date.now(),updated_at:Date.now(),is_demo_example:true};example.print={status:"demo_printed",receipt:kitchenReceipt(example)};shop.orders.push(example);}
    state.merchantExampleAdded=true;save(state);
  }
  for (const shop of Object.values(state.shops)) for (const order of shop.orders) if (order.status === "reserved" && order.created_at < Date.now() - 15 * 60000) order.status = "expired";
  return state;
}
function save(state: State) { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { throw new Error("浏览器演示存储已满或被禁用，请移除部分图片或重置演示数据。"); } }
function license(m: Row) { return { valid: !m.suspended && m.license_expires > Date.now(), expiresAt: m.license_expires, suspended: !!m.suspended, signatureValid: false }; }
function heartbeat(m: Row) { return { lastSeen: m.last_heartbeat, online: !!m.last_heartbeat && Date.now() - m.last_heartbeat < 70000, ageSeconds: m.last_heartbeat ? Math.floor((Date.now() - m.last_heartbeat) / 1000) : null, source: "浏览器模拟", offlineAfterSeconds: 70 }; }
function merchantData(shop: Shop) { return { merchant: shop.merchant, license: license(shop.merchant), products: shop.products.slice().sort((a, b) => a.sort - b.sort), orders: shop.orders.slice().reverse().map(publicOrder) }; }
function serviceData(state: State, shop: Shop) { const m = shop.merchant; return { merchant: { id: m.id, name: m.name, printerOnline: m.printer_online, capacity: m.capacity, heartbeat: heartbeat(m) }, license: license(m), events: shop.events.slice().reverse(), tenants: Object.values(state.shops).map(s => ({ id: s.merchant.id, name: s.merchant.name, license: license(s.merchant), heartbeat: heartbeat(s.merchant), stats: summarizeOrders(s.orders) })) }; }
function catalog(shop: Shop) {
  const m = shop.merchant, start = Math.ceil((Date.now() + 10 * 60000) / 600000) * 600000;
  return { merchant: { id: m.id, name: m.name, subtitle: m.subtitle, description: m.description, accent: m.accent, heroImage: m.hero_image, contactPhone: m.contact_phone, categoryOrder: m.categoryOrder }, license: license(m), products: shop.products.filter(p => p.active), slots: Array.from({ length: 12 }, (_, i) => { const at = start + i * 600000; const used = shop.orders.filter(o => o.pickup_at === at && !["cancelled", "expired"].includes(o.status)).reduce((sum, o) => sum + o.quantity, 0); return { at, label: stamp(at), remaining: Math.max(0, m.capacity - used) }; }), pickupWindow: pickupWindow(), demoMode: true };
}
function image(value: unknown) { if (!value) return null; if (typeof value !== "string" || value.length > 420000 || !/^data:image\/(jpeg|png|webp);base64,/.test(value)) throw new Error("请选择有效且已压缩的 JPG、PNG 或 WebP 图片。"); return value; }
function requireRole(key: string, shop: Shop, admin = false) { if (key !== (admin ? ADMIN_KEY : shop.key)) throw new Error(admin ? "公开演示超管密钥为 demo-admin" : "店家密钥与这家店不匹配"); }
function receipt(o:Row){return kitchenReceipt(o);}
function publicOrder(o: Row) { const { accessToken: _token, idempotencyKey: _id, ...rest } = o; return rest; }
function run(tenant: string, view: string, key: string, body?: Row, token = "") {
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(tenant)) throw new Error("店家编号无效。");
  const state = read();
  if (body?.action === "merchant_login") { const matches=Object.values(state.shops).filter(s=>s.key===key); if (!key||key===ADMIN_KEY||matches.length!==1) throw new Error("店家密钥不正确");save(state);return merchantData(matches[0]); }
  const shop = state.shops[tenant]; if (!shop) throw new Error("这个浏览器中还没有该店家，请通过超管演示创建。");
  const query = new URLSearchParams(view.includes("=") ? view : "view=" + view);
  if (!body) {
    if (query.get("view") === "merchant") { requireRole(key, shop); return merchantData(shop); }
    if (query.get("view") === "service") { requireRole(key, shop, true); return serviceData(state, shop); }
    if (query.get("view") === "operations") {
      requireRole(key,shop,true);const {page,search,pageSize}=orderQuery(query), matches=shop.orders.filter(o=>!search||o.id.includes(search)||o.pickup_code.includes(search)).sort((a,b)=>b.created_at-a.created_at||b.id.localeCompare(a.id));
      return {merchant:{id:tenant,name:shop.merchant.name},summary:summarizeOrders(shop.orders),orders:matches.slice((page-1)*pageSize,page*pageSize).map(o=>({...publicOrder(o),print_status:o.print?.status})),pagination:{page,pageSize,total:matches.length,search}};
    }
    if (query.get("view") === "order") { const o = shop.orders.find(o => o.id === query.get("id") && o.accessToken === token); if (!o) throw new Error("未找到这笔演示预约。"); return publicOrder(o); }
    return catalog(shop);
  }
  const p = body.payload || {}, action = body.action, m = shop.merchant;
  if (action === "order") {
    const previous = shop.orders.find(o => o.idempotencyKey === p.idempotencyKey);
    if (previous) { if (previous.accessToken !== p.accessToken) throw new Error("重复预约信息不一致。"); return publicOrder(previous); }
    if (!license(m).valid) throw new Error("店家演示授权已到期或暂停。");
    if (!Array.isArray(p.items) || !p.items.length || p.items.length > 20 || !p.accessToken || !p.idempotencyKey) throw new Error("预约信息无效。");
    const seen = new Set(); const items = p.items.map((i: Row) => { const product = shop.products.find(v => v.id === i.id && v.active); if (!product || product.price !== i.expectedPrice || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 6 || seen.has(i.id)) throw new Error("菜单或数量已变化，请重新确认。"); seen.add(i.id); return { id: product.id, name: product.name, category: product.category, price: product.price, quantity: i.quantity }; });
    const quantity = items.filter((i: Row) => i.category !== "单独加料").reduce((n: number, i: Row) => n + i.quantity, 0), bucket = pickupBucket(p.pickupAt), used = shop.orders.filter(o => o.pickup_at >= bucket.start && o.pickup_at < bucket.end && !["cancelled","expired"].includes(o.status)).reduce((sum,o)=>sum+o.quantity,0);
    if (quantity < 1 || quantity > 6 || !validPickup(p.pickupAt) || m.capacity - used < quantity) throw new Error("请选择有效且有足够名额的预约时段。");
    const total = items.reduce((n: number, i: Row) => n + i.price * i.quantity, 0);
    const order: Row = { id: crypto.randomUUID(), merchant_id: tenant, accessToken: p.accessToken, idempotencyKey: p.idempotencyKey, pickup_code: crypto.randomUUID().slice(0, 6).toUpperCase(), pickup_at: p.pickupAt, quantity, items, total, spice: String(p.spice || "微辣"), note: String(p.note || "").slice(0, 120), alias: String(p.alias || "").slice(0, 20), status: "reserved", payment_state: "unconfirmed", created_at: Date.now(), updated_at: Date.now() };
    order.print = { status: m.printer_online ? "demo_printed" : "queued", receipt: receipt(order) }; shop.orders.push(order); save(state); return publicOrder(order);
  }
  requireRole(key, shop, ["service", "create_tenant"].includes(action));
  let result: Row;
  if (action === "product") {
    if (!String(p.name || "").trim() || !String(p.category || "").trim() || p.category === "全部" || !Number.isInteger(p.price) || p.price < 0 || p.price > 100000 || typeof p.active !== "boolean") throw new Error("请填写有效商品名称、分类与价格。");
    let product = p.id ? shop.products.find(i => i.id === p.id) : null; if (p.id && !product) throw new Error("本店没有这款商品。");
    if (!product) { product = { id: "custom-" + crypto.randomUUID(), merchant_id: tenant, sort: Date.now() }; shop.products.push(product); }
    Object.assign(product, { name: String(p.name).slice(0, 60), category: String(p.category).slice(0, 30), price: p.price, active: p.active ? 1 : 0, description: String(p.description || "").slice(0, 160), image_data: image("imageData" in p ? p.imageData : p.image_data), updated_at: Date.now() }); result = merchantData(shop);
  } else if (action === "profile") {
    if (!String(p.name || "").trim() || !["#ea531a", "#0f766e", "#2563eb", "#7c3aed", "#be123c", "#4338ca"].includes(p.accent)) throw new Error("店名或主题颜色无效。");
    Object.assign(m, { name: String(p.name).slice(0, 60), subtitle: String(p.subtitle || "").slice(0, 80), description: String(p.description || "").slice(0, 160), accent: p.accent, contact_phone: contactPhone(p.contactPhone), categoryOrder: categoryOrder(p.categoryOrder), hero_image: image(p.heroImage) }); result = merchantData(shop);
  } else if (action === "heartbeat") { m.last_heartbeat = Date.now(); result = { receivedAt: m.last_heartbeat, license: license(m) }; }
  else if (action === "order_action") {
    const order = shop.orders.find(o => o.id === p.id); if (!order) throw new Error("本店没有这笔订单。");
    if (p.action === "confirm_payment" && ["reserved", "expired", "payment_review", "paid"].includes(order.status)) { order.payment_state = "merchant_confirmed"; order.status = order.status === "expired" ? "payment_review" : "paid"; }
    else if (p.action === "ready" && order.status === "paid") order.status = "ready";
    else if (p.action === "picked_up" && order.status === "ready") order.status = "completed";
    else if (p.action === "cancel" && order.payment_state === "unconfirmed" && ["reserved", "expired"].includes(order.status)) order.status = "cancelled";
    else throw new Error("这笔订单当前不能执行该操作。"); order.updated_at = Date.now(); result = merchantData(shop);
  } else if (action === "service") {
    let issued = "";
    if (["issue", "set_expiry", "expire"].includes(p.action)) {
      let expiry = Date.now() - 1;
      if (p.action === "set_expiry") { expiry = Number(p.expiresAt); if (!Number.isSafeInteger(expiry) || expiry <= Date.now() || expiry > Date.now() + 5 * 366 * 86400000) throw new Error("请选择五年以内的有效到期时间。"); }
      if (p.action === "issue") { const date = new Date(Math.max(Date.now(), m.license_expires)); const day = date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + 1); const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate(); date.setUTCDate(Math.min(day, last)); expiry = date.getTime(); }
      m.license_expires = expiry; if (p.action !== "expire") m.suspended = false;
      issued = `demo-license:${tenant}:${expiry}`; shop.events.push({ id: crypto.randomUUID(), kind: p.action === "expire" ? "demo_expire" : p.action, expires_at: expiry, created_at: Date.now() });
    } else if (["suspend", "resume"].includes(p.action)) m.suspended = p.action === "suspend";
    else if (p.action === "printer" && typeof p.online === "boolean") { m.printer_online = p.online; if (p.online) for (const o of shop.orders) if (o.print.status === "queued") o.print.status = "demo_printed"; }
    else if (p.action === "capacity" && Number.isInteger(p.capacity) && p.capacity >= 1 && p.capacity <= 30) m.capacity = p.capacity;
    else throw new Error("演示设置无效。"); result = { ...serviceData(state, shop), ...(issued ? { issuedLicense: issued } : {}) };
  } else if (action === "activate") {
    const parts = String(p.license).split(":"); const expiry = Number(parts[2]);
    if (parts.length !== 3 || parts[0] !== "demo-license" || parts[1] !== tenant || expiry !== m.license_expires || !license(m).valid) throw new Error("演示 License 无效或与店家不匹配。"); result = merchantData(shop);
  } else if (action === "create_tenant") {
    const id = String(p.id || "").trim(), name = String(p.name || "").trim();
    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(id) || !name || name.length > 60) throw new Error("请填写有效店家编号和名称。");
    if (state.shops[id]) throw new Error("这个店家编号已存在。"); state.shops[id] = makeShop(id, name, [], 0); result = { ...serviceData(state, shop), createdTenant: { id, name, key: state.shops[id].key } };
  } else throw new Error("未知演示操作。");
  save(state); return result;
}
export async function demoRequest(tenant: string, view = "", key = "", body?: Row, token = ""): Promise<Row> { return structuredClone(run(tenant, view, key, body, token)); }
