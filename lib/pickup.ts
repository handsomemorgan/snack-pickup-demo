type Row=Record<string,any>;
export const MINUTE=60000, CAPACITY_BUCKET=10*MINUTE;
export function pickupWindow(now=Date.now()){return {earliest:Math.ceil((now+10*MINUTE)/MINUTE)*MINUTE,latest:Math.floor((now+24*60*MINUTE)/MINUTE)*MINUTE};}
export function validPickup(at:number,now=Date.now()){const window=pickupWindow(now);return Number.isSafeInteger(at)&&at%MINUTE===0&&at>=window.earliest&&at<=window.latest;}
export function pickupBucket(at:number){const start=Math.floor(at/CAPACITY_BUCKET)*CAPACITY_BUCKET;return {start,end:start+CAPACITY_BUCKET};}
export const pickupClock=(at:number)=>new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit",hour12:false}).format(at);
export function categoryOrder(value:unknown){
  if(value===undefined)return [];
  if(!Array.isArray(value)||value.length>30||value.some(v=>typeof v!=="string"||!v.trim()||v.trim().length>30||["全部","团建/大批量购买"].includes(v.trim())))throw new Error("分类最多30个，每个1—30字；请勿使用保留名称");
  const result=value.map(v=>v.trim());if(new Set(result).size!==result.length)throw new Error("分类名称不能重复");return result;
}
export function contactPhone(value:unknown){const phone=String(value??"").trim();if(!/^[0-9+() -]{7,24}$/.test(phone)||phone.replace(/\D/g,"").length<7||phone.replace(/\D/g,"").length>15)throw new Error("请填写有效的店家联系电话");return phone;}
export function kitchenReceipt(order:Row){
  const items=typeof order.items==="string"?JSON.parse(order.items):order.items;
  const flavour=[order.spice==="不辣"?"不加辣":order.spice,order.note].filter(Boolean).join("；");
  return [pickupClock(order.pickup_at),...items.map((i:Row)=>`${i.name} ${i.quantity}份${flavour?`（${flavour}）`:""}`),`取餐码 ${order.pickup_code} · ${new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",month:"numeric",day:"numeric"}).format(order.pickup_at)}`,"预约票 · 不代表已付款"].join("\n");
}
// Only our own tags are emitted; merchant names and customer notes cannot inject commands.
export function feieReceipt(text:string){const lines=text.split("\n").map(line=>line.replace(/[<>\x00-\x1f]/g,""));if(!/^\d{2}:\d{2}$/.test(lines[0]))return lines.join("<BR>");return `<CB>${lines[0]}</CB><BR>`+lines.slice(1).map(line=>line.startsWith("取餐码 ")||line.startsWith("预约票")?line+"<BR>":`<B>${line}</B><BR>`).join("");}
