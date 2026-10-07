"use client";
import { useState } from "react";
import { TrendingUp, Trophy, ShoppingBag, Wallet } from "lucide-react";
import { exampleMerchantAnalytics, type MerchantAnalytics } from "@/lib/operations";

const money = (cents: number) => (cents / 100).toLocaleString("zh-CN", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
const clock = (hour: number) => String(hour).padStart(2, "0") + ":00";

export function MerchantDashboard({ data, publicDemo, merchantId }: { data: MerchantAnalytics; publicDemo: boolean; merchantId: string }) {
  const [sample, setSample] = useState(false), [mode, setMode] = useState<"pickup" | "order">("pickup"), [selected, setSelected] = useState<number | null>(null);
  const stats = sample ? exampleMerchantAnalytics(merchantId, data.generatedAt) : data;
  const hours = mode === "pickup" ? stats.pickupHours : stats.orderHours;
  const max = Math.max(2, ...hours.map(h => h.orders));
  const peak = Math.max(...hours.map(h => h.orders));
  const peakHours = peak ? hours.filter(h => h.orders === peak).map(h => h.hour) : [];
  const hour = selected ?? peakHours[0] ?? new Date(stats.generatedAt + 8 * 3600000).getUTCHours();
  const row = hours[hour], x = (h: number) => 40 + h * 23.2, y = (n: number) => 202 - n / max * 160;
  const points = hours.map(h => `${x(h.hour)},${y(h.orders)}`).join(" ");
  const date = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "long", day: "numeric" }).format(stats.dayStart);
  const updated = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).format(stats.generatedAt);
  return <section className="merchant-dashboard" aria-label="今日经营看板">
    <div className="dashboard-heading"><div><p className="eyebrow dark">{date} · 今日经营</p><h2>今天的生意，一眼看清</h2></div><span className="dashboard-updated">{publicDemo ? "模拟订单" : "本店订单"} · {updated} 更新</span></div>
    {publicDemo && <div className="analytics-demo"><span>{sample ? "正在查看一整天的虚构示例，不计入本店订单。" : "当前浏览器演示订单；可切换示例体验高峰趋势。"}</span><button className="text-button" onClick={() => { setSample(!sample); setSelected(null); }}>{sample ? "返回本店演示订单" : "查看示例经营数据"}</button></div>}
    <div className="sales-cards">
      <div className="sales-card"><span><ShoppingBag size={16}/>今日已售订单</span><strong>{stats.soldOrders}<small> 单</small></strong><p>共售出 {stats.portions} 份餐品</p></div>
      <div className="sales-card revenue-card"><span><Wallet size={16}/>今日已核款金额</span><strong><small>¥ </small>{money(stats.revenue)}</strong><p>餐费直接由店家收取</p></div>
    </div>
    <p className="analytics-definition">按北京时间今日下单且已确认收款统计，排除取消、超时和待处理订单；金额含加料，餐品份数与排行不含单独加料。</p>
    <div className="analytics-grid">
      <section className="panel traffic-panel" aria-labelledby="traffic-title">
        <div className="analytics-title"><h2 id="traffic-title"><TrendingUp size={20}/>客流高峰</h2><span>订单 / 小时</span></div>
        <div className="chart-switch" aria-label="客流统计方式"><button aria-pressed={mode === "pickup"} className={mode === "pickup" ? "selected" : ""} onClick={() => { setMode("pickup"); setSelected(null); }}>取餐高峰</button><button aria-pressed={mode === "order"} className={mode === "order" ? "selected" : ""} onClick={() => { setMode("order"); setSelected(null); }}>下单高峰</button></div>
        <p className="chart-note">{mode === "pickup" ? "按今天的预约取餐时间，帮助安排备料与出餐。" : "按今天的下单时间，帮助判断顾客何时点单。"}仅统计已核款、可履约订单，不代表实际到店人数。</p>
        <div className="traffic-plot"><svg viewBox="0 0 600 252" role="img" aria-label={`${mode === "pickup" ? "取餐" : "下单"}高峰折线图，${peak ? `最高每小时${peak}单` : "今日暂无已核款订单"}`} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setSelected(Math.max(0, Math.min(23, Math.round(((event.clientX - rect.left) / rect.width * 600 - 40) / 23.2)))); }}>
          {[0, .5, 1].map(level => <g key={level}><line x1="40" x2="574" y1={y(max * level)} y2={y(max * level)} stroke="#e9edf2" strokeDasharray={level ? "4 5" : undefined}/><text x="28" y={y(max * level) + 6} textAnchor="end" fill="#788391" fontSize="20">{Math.round(max * level)}</text></g>)}
          <polygon points={`40,202 ${points} 574,202`} fill="#ea531a" opacity=".08"/>
          <polyline points={points} fill="none" stroke="#ea531a" strokeWidth="3.5" strokeLinejoin="round"/>
          <line x1={x(hour)} x2={x(hour)} y1="34" y2="202" stroke="#efbea8" strokeDasharray="5 5"/>
          {hours.filter(h => h.orders > 0).map(h => <circle key={h.hour} cx={x(h.hour)} cy={y(h.orders)} r="4" fill="#ea531a"/>)}
          <circle cx={x(hour)} cy={y(row.orders)} r="7" fill="#fff" stroke="#ea531a" strokeWidth="3"/>
          {[0, 6, 12, 18, 23].map(h => <text key={h} x={x(h)} y="236" textAnchor="middle" fill="#788391" fontSize="22">{String(h).padStart(2, "0")}:00</text>)}
        </svg></div>
        <div className="hour-readout"><label htmlFor="traffic-hour">查看时段<select aria-label="查看时段" id="traffic-hour" value={hour} onChange={event => setSelected(Number(event.target.value))}>{hours.map(h => <option key={h.hour} value={h.hour}>{clock(h.hour)}—{h.hour === 23 ? "24:00" : clock(h.hour + 1)}</option>)}</select></label><div aria-live="polite"><strong>{row.orders}<small> 单</small></strong><span>{row.portions} 份餐品</span></div></div>
        <p className="peak-summary">{peak ? <>高峰时段 <strong>{peakHours.map(clock).join("、")}</strong> · 每小时 {peak} 单</> : "今日暂无已核款订单，确认收款后会自动形成曲线。"}</p>
      </section>
      <section className="panel bestseller-panel" aria-labelledby="bestseller-title">
        <div className="analytics-title"><h2 id="bestseller-title"><Trophy size={20}/>今日热销餐品</h2><span>按售出份数</span></div>
        {stats.bestSellers.length ? <><div className="bestseller-winner"><span>今天卖得最好</span><strong>{stats.bestSellers[0].name}</strong><p>{stats.bestSellers[0].quantity} 份 · 餐品金额 ¥{money(stats.bestSellers[0].revenue)}</p></div><ol className="bestseller-list">{stats.bestSellers.map((food, i) => <li key={food.id}><span className="rank-number">{i + 1}</span><div><strong>{food.name}</strong><div className="rank-track"><span style={{ width: `${food.quantity / stats.bestSellers[0].quantity * 100}%` }}/></div></div><span className="rank-count">{food.quantity} 份</span></li>)}</ol></> : <div className="analytics-empty"><Trophy size={30}/><p>第一笔确认收款后<br/>这里会显示热销餐品</p></div>}
        <p className="chart-note">保留订单中的餐品名称和售价，菜单改价不改变历史销售金额。</p>
      </section>
    </div>
  </section>;
}
