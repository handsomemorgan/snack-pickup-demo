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

export type MerchantAnalytics = { dayStart: number; generatedAt: number; soldOrders: number; revenue: number };

// Beijing calendar day and integer cents. Only accepted, confirmed sales count.
export function merchantAnalytics(orders: Row[], merchantId: string, now = Date.now()): MerchantAnalytics {
  const start = chinaDayStart(now), end = start + 86400000;
  const sold = orders.filter(o => o.merchant_id === merchantId && o.payment_state === "merchant_confirmed" && ["paid", "ready", "completed"].includes(o.status) && o.created_at >= start && o.created_at < end);
  return { dayStart: start, generatedAt: now, soldOrders: sold.length, revenue: sold.reduce((sum,o) => sum + o.total, 0) };
}
