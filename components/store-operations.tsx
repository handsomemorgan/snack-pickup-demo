"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
type Data=Record<string,any>;
type Loader=(tenant:string,view:string,key:string)=>Promise<Data>;
const money=(value:number)=>((value||0)/100).toFixed(2);
const when=(value:number)=>new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(value);
const statuses:Record<string,string>={reserved:"待确认收款",paid:"已确认收款",ready:"待取餐",completed:"已取餐",cancelled:"已取消",expired:"预约超时",payment_review:"迟付款待协商"};
export function StoreOperations({tenant,adminKey,load,publicDemo}:{tenant:string;adminKey:string;load:Loader;publicDemo:boolean}){
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[draft,setDraft]=useState(""),[search,setSearch]=useState(""),[page,setPage]=useState(1),[detail,setDetail]=useState<Data|null>(null);
  const generation=useRef(0);
  const refresh=useCallback(async()=>{
    const id=++generation.current;
    try{const result=await load(tenant,"view=operations&page="+page+"&search="+encodeURIComponent(search),adminKey);if(generation.current===id){setData(result);setError("");setDetail(old=>old?result.orders.find((o:Data)=>o.id===old.id)||null:null);}}
    catch(e){if(generation.current===id){setData(null);setError((e as Error).message);}}
  },[tenant,adminKey,load,page,search]);
  useEffect(()=>{setData(null);setDetail(null);void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>{++generation.current;clearInterval(timer);};},[refresh]);
  const summary=data?.summary;
  return <section className="panel operations-panel" aria-label="店家营业数据">
    <div className="section-title"><h2>{data?.merchant.name||tenant} · 营业数据与订单</h2><button className="secondary" onClick={()=>void refresh()}>刷新营业数据</button></div>
    <p className="small-note">{publicDemo?"浏览器模拟记录，不是真实营业数据。":"来自本店数据库中的订单记录；当前收款状态由店家人工核对，不是支付宝账单。"} 金额仅累计已核对收款订单，不含待付款预约；不代表净利润或扣除退款后的收入。今日按北京时间的建单日期归属。</p>
    {error&&<p className="error" role="alert">{error}</p>}
    {summary&&<div className="stats-grid"><div className="stat"><span>累计已核款订单金额</span><strong>¥{money(summary.confirmedRevenue)}</strong><small>{summary.confirmedOrders||0} 笔已核款订单</small></div><div className="stat"><span>今日建单已核款金额</span><strong>¥{money(summary.todayRevenue)}</strong><small>今日建立 {summary.todayOrders||0} 笔订单</small></div><div className="stat"><span>累计订单</span><strong>{summary.totalOrders||0}<small> 笔</small></strong><small>包含取消与超时记录</small></div><div className="stat"><span>待核款 / 已取餐</span><strong>{summary.unconfirmedOrders||0} / {summary.completedOrders||0}</strong><small>统计全部订单，独立于下方搜索</small></div></div>}
    <form className="order-search" onSubmit={e=>{e.preventDefault();setPage(1);setSearch(draft.trim());}}><label htmlFor="order-search">查找本店订单</label><Input id="order-search" maxLength={100} placeholder="输入订单编号或取餐码" value={draft} onChange={e=>setDraft(e.target.value)}/><button className="secondary" type="submit">查询订单</button><button className="text-button" type="button" onClick={()=>{setDraft("");setSearch("");setPage(1);}}>清空查询</button></form>
    {!data&&!error&&<p className="muted">正在读取营业记录…</p>}
    {data&&<><div className="table-wrap"><Table><TableHeader><TableRow><TableHead>订单编号 / 取餐码</TableHead><TableHead>建立时间</TableHead><TableHead>预约取餐</TableHead><TableHead>金额</TableHead><TableHead>订单状态</TableHead><TableHead>收款状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>{data.orders.map((o:Data)=><TableRow key={o.id}><TableCell><code className="order-id">{o.id}</code><span>取餐码 {o.pickup_code}</span></TableCell><TableCell>{when(o.created_at)}</TableCell><TableCell>{when(o.pickup_at)}</TableCell><TableCell>¥{money(o.total)}</TableCell><TableCell>{statuses[o.status]||o.status}</TableCell><TableCell>{o.payment_state==="merchant_confirmed"?"店家已核款":"尚未核款"}</TableCell><TableCell><button className="text-button" onClick={()=>setDetail(o)}>订单详情</button></TableCell></TableRow>)}</TableBody></Table></div>{!data.orders.length&&<p className="muted">{search?"未找到匹配的本店订单。":"这家店还没有订单记录。"}</p>}<div className="orders-pagination"><span>匹配 {data.pagination.total} 笔 · 第 {page} / {Math.max(1,Math.ceil(data.pagination.total/data.pagination.pageSize))} 页，每页 {data.pagination.pageSize} 笔</span><button className="secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>上一页</button><button className="secondary" disabled={page*data.pagination.pageSize>=data.pagination.total} onClick={()=>setPage(p=>p+1)}>下一页</button></div></>}
    <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null);}}><DialogContent className="receipt-dialog"><DialogHeader><DialogTitle>订单详情 · {detail?.pickup_code}</DialogTitle><DialogDescription>{publicDemo?"仅为浏览器模拟订单。":"来自当前店家的订单记录。"} 商品名称和金额保留建单时的快照。</DialogDescription></DialogHeader>{detail&&<><p className="order-id">订单编号：{detail.id}</p><p>店家：{data?.merchant.name}（{detail.merchant_id}）</p><p>建立：{when(detail.created_at)}<br/>预约：{when(detail.pickup_at)}</p><div>{detail.items.map((item:Data)=><p className="order-item" key={item.id}><span>{item.name} × {item.quantity}</span><strong>¥{money(item.price*item.quantity)}</strong></p>)}</div><strong>合计 ¥{money(detail.total)}</strong><p>状态：{statuses[detail.status]||detail.status} · {detail.payment_state==="merchant_confirmed"?"店家已核款":"尚未核款"}</p><p>称呼：{detail.alias||"未填写"}<br/>口味：{detail.spice}<br/>备注：{detail.note||"无"}</p><p className="small-note">打印状态：{detail.print_status||"暂无记录"} · 最近更新 {when(detail.updated_at)}</p></>}</DialogContent></Dialog>
  </section>;
}
