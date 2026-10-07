export function KitchenTicket({text}:{text:string}){
  const lines=text.split("\n");
  if(!/^\d{2}:\d{2}$/.test(lines[0]))return <pre className="receipt">{text}</pre>;
  const footer=lines.findIndex(line=>line.startsWith("取餐码 "));
  return <article className="kitchen-ticket" aria-label="简洁出餐票"><strong className="ticket-time">{lines[0]}</strong><div className="ticket-items">{lines.slice(1,footer<0?lines.length:footer).map((line,i)=><p key={i}>{line}</p>)}</div>{footer>=0&&<footer>{lines.slice(footer).map((line,i)=><p key={i}>{line}</p>)}</footer>}</article>;
}
