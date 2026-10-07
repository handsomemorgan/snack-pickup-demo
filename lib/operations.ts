type Row = Record<string, any>;
export function chinaDayStart(now = Date.now()) {
  const day = 86400000, offset = 8 * 3600000;
  return Math.floor((now + offset) / day) * day - offset;
}
export function orderQuery(query: URLSearchParams) {
  const page = Number(query.get("page") || 1), search = (query.get("search") || "").trim();
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || search.length > 100) throw new Error("订单查询参数无效");
  return { page, search, pageSize: 20 };
}
export function summarizeOrders(orders: Row[], now = Date.now()) {
  const paid = orders.filter(o => o.payment_state === "merchant_confirmed"), today = orders.filter(o => o.created_at >= chinaDayStart(now));
  return { totalOrders: orders.length, confirmedOrders: paid.length, confirmedRevenue: paid.reduce((sum, o) => sum + o.total, 0), todayOrders: today.length, todayRevenue: today.filter(o => o.payment_state === "merchant_confirmed").reduce((sum, o) => sum + o.total, 0), unconfirmedOrders: orders.filter(o => o.status === "reserved" && o.payment_state === "unconfirmed").length, completedOrders: orders.filter(o => o.status === "completed").length };
}

export type HourSales = { hour: number; orders: number; portions: number };
export type MerchantAnalytics = {
  dayStart: number; generatedAt: number; soldOrders: number; revenue: number; portions: number;
  bestSellers: { id: string; name: string; quantity: number; revenue: number }[];
  orderHours: HourSales[]; pickupHours: HourSales[];
};

// China calendar day, integer cents, and order snapshots are shared by both adapters.
// A paid but unresolved payment_review order is not an accepted sale or pickup.
export function merchantAnalytics(orders: Row[], merchantId: string, now = Date.now()): MerchantAnalytics {
  const start = chinaDayStart(now), end = start + 86400000;
  const accepted = orders.filter(o => o.merchant_id === merchantId && o.payment_state === "merchant_confirmed" && ["paid", "ready", "completed"].includes(o.status));
  const inDay = (at: number) => at >= start && at < end;
  const sold = accepted.filter(o => inDay(o.created_at));
  const orderHours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, portions: 0 }));
  const pickupHours = orderHours.map(row => ({ ...row }));
  const ranking = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();
  const mainItems = (o: Row) => (o.items as Row[]).filter(item => item.category !== "单独加料");
  const portions = (o: Row) => mainItems(o).reduce((n, item) => n + item.quantity, 0);
  for (const o of accepted) {
    const count = portions(o);
    if (inDay(o.created_at)) {
      const row = orderHours[Math.floor((o.created_at - start) / 3600000)];
      row.orders++; row.portions += count;
      for (const item of mainItems(o)) {
        const key = item.id || item.name;
        const entry = ranking.get(key) || { id: key, name: item.name, quantity: 0, revenue: 0 };
        entry.quantity += item.quantity; entry.revenue += item.price * item.quantity;
        ranking.set(key, entry);
      }
    }
    if (inDay(o.pickup_at)) {
      const row = pickupHours[Math.floor((o.pickup_at - start) / 3600000)];
      row.orders++; row.portions += count;
    }
  }
  return {
    dayStart: start, generatedAt: now, soldOrders: sold.length,
    revenue: sold.reduce((n, o) => n + o.total, 0), portions: sold.reduce((n, o) => n + portions(o), 0),
    bestSellers: [...ranking.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.id.localeCompare(b.id)).slice(0, 5),
    orderHours, pickupHours,
  };
}

// Display-only sample: never persisted as orders or combined with store totals.
export function exampleMerchantAnalytics(merchantId: string, now = Date.now()) {
  const start = chinaDayStart(now), counts = [0,0,0,0,0,0,0,1,2,1,2,7,10,4,1,2,3,8,6,3,2,1,0,0];
  const foods = [{id:"example-main",name:"招牌烤冷面",price:900},{id:"example-egg",name:"双蛋烤冷面",price:1000},{id:"example-sausage",name:"烤肠烤冷面",price:900}];
  const rows: Row[] = [];
  counts.forEach((count,hour) => { for(let i=0;i<count;i++) {
    const food = foods[i % 5 === 0 ? 1 : i % 5 === 1 ? 2 : 0], quantity = i % 4 === 0 ? 2 : 1;
    const at = start + hour * 3600000 + (5 + i * 4) * 60000;
    rows.push({merchant_id:merchantId,created_at:at,pickup_at:at+15*60000,status:"completed",payment_state:"merchant_confirmed",total:food.price*quantity,items:[{...food,category:"基础款",quantity}]});
  }});
  return merchantAnalytics(rows, merchantId, now);
}
