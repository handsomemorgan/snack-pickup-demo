"use client";
import { useState } from "react";
import { Store, Phone, ShieldCheck, Activity, UtensilsCrossed, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Shop = { name: string; contact_phone?: string; last_heartbeat?: number | null };
type License = { valid: boolean; expiresAt: number; suspended: boolean };
type Props = {
  shop: Shop; license: License; heartbeat: { online: boolean; lastSeen?: number | null }; busy: boolean; publicDemo: boolean;
  onSave: (name: string, phone: string) => Promise<boolean>;
  onActivate: (license: string) => Promise<boolean>;
  onHeartbeat: () => Promise<boolean>;
  onProducts: () => void; onPresentation: () => void;
};
const when = (at?: number | null) => at ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(at) : "尚未上报";

export function MerchantSettings({ shop, license, heartbeat, busy, publicDemo, onSave, onActivate, onHeartbeat, onProducts, onPresentation }: Props) {
  const [name, setName] = useState(shop.name), [phone, setPhone] = useState(shop.contact_phone || ""), [licenseInput, setLicenseInput] = useState("");
  const online = heartbeat.online;
  return <div className="merchant-settings" aria-label="店家设置页面">
    <section className="panel"><h2><Store size={21}/>店家信息</h2><form onSubmit={async event => { event.preventDefault(); if (!busy) await onSave(name.trim(), phone.trim()); }}>
      <label className="label" htmlFor="merchant-setting-name">店名</label><Input id="merchant-setting-name" value={name} onChange={event => setName(event.target.value)} maxLength={60} required autoComplete="organization"/>
      <label className="label" htmlFor="merchant-setting-phone"><Phone size={15}/>手机号</label><Input id="merchant-setting-phone" type="tel" inputMode="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={24} required autoComplete="tel" placeholder="填写店家联系电话"/>
      <button className="primary full" disabled={busy || !name.trim() || !phone.trim()} type="submit">保存店家信息</button><p className="small-note">保存后，店名和联系电话同步到顾客端。</p>
    </form></section>
    <section className="panel"><div className="setting-section-title"><h2><ShieldCheck size={21}/>License 授权</h2><span className={"pill " + (license.valid ? "success" : "danger")}>{license.valid ? "授权有效" : license.suspended ? "已暂停" : "授权已到期"}</span></div>
      <p className="setting-status">到期时间：{when(license.expiresAt)}</p><label className="label" htmlFor="merchant-license">输入 License</label><Textarea id="merchant-license" value={licenseInput} onChange={event => setLicenseInput(event.target.value)} placeholder="粘贴服务方提供的 License"/>
      <button className="primary full" disabled={busy || !licenseInput.trim()} onClick={async () => { if (await onActivate(licenseInput.trim())) setLicenseInput(""); }}>验证并激活 License</button><p className="small-note">授权仅对本店有效，到期后已有订单仍可处理。{publicDemo && "当前为浏览器模拟授权。"}</p>
    </section>
    <section className="panel"><div className="setting-section-title"><h2><Activity size={21}/>心跳验证</h2><span className={"pill " + (online ? "success" : "danger")}>{online ? "工作台在线" : "工作台离线"}</span></div>
      <p className="setting-status">最近心跳：{when(heartbeat.lastSeen)}</p><button className="secondary full" disabled={busy} onClick={() => void onHeartbeat()}>立即验证心跳</button><p className="small-note">每 20 秒自动上报，超过 70 秒未上报显示离线。浏览器休眠会影响上报，心跳不代表打印机状态。{publicDemo && "当前为浏览器模拟心跳。"}</p>
    </section>
    <section className="panel"><h2>菜单与点单设置</h2><div className="button-row"><button className="secondary" onClick={onProducts}><UtensilsCrossed size={18}/>商品管理</button><button className="secondary" onClick={onPresentation}><PenLine size={18}/>分类与店铺展示</button></div></section>
  </div>;
}
