"use client";
import { ShoppingBag, Wallet } from "lucide-react";
import type { MerchantAnalytics } from "@/lib/operations";

const money = (cents: number) => (cents / 100).toLocaleString("zh-CN", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });

export function MerchantDashboard({ data, publicDemo }: { data: Pick<MerchantAnalytics, "dayStart" | "soldOrders" | "revenue">; publicDemo: boolean }) {
  const date = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "long", day: "numeric" }).format(data.dayStart);
  return <section className="merchant-dashboard" aria-label="每日营业汇总">
    <div className="daily-summary-heading"><h2>{date} · 今日营业</h2>{publicDemo && <span>演示数据</span>}</div>
    <div className="sales-cards">
      <div className="sales-card"><span><ShoppingBag size={16}/>今日订单数</span><strong>{data.soldOrders}<small> 单</small></strong></div>
      <div className="sales-card revenue-card"><span><Wallet size={16}/>今日营业额</span><strong><small>¥ </small>{money(data.revenue)}</strong></div>
    </div>
    <p className="daily-summary-note">按今日下单且已核款统计，未付款、取消和待协商订单不计入。</p>
  </section>;
}
