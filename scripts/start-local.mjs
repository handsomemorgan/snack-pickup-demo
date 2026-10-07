import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { migrateLocal } from "./migrate-local.mjs";
const version = process.versions.node.split(".").map(Number);
if (version[0] < 22 || (version[0] === 22 && version[1] < 13)) {
  console.error("请使用 Node.js 22.13 或以上版本。"); process.exit(1);
}
for (const file of ["node_modules/vinext/dist/cli.js", ".env.local", ".dev.vars"]) {
  if (!existsSync(file)) { console.error(`缺少 ${file}，请按 README 完成首次配置。`); process.exit(1); }
}
const url = "http://127.0.0.1:5173/";
async function ownServerReady() {
  try {
    const res = await fetch(url + "api/snack", { signal: AbortSignal.timeout(1500) });
    const data = await res.json();
    return res.ok && Array.isArray(data.products) && data.merchant?.id === "demo-stall";
  } catch { return false; }
}
function openPage() {
  console.log(`本地网站：${url} （无需 ChatGPT 登录）`);
  if (!process.argv.includes("--no-open") && process.platform === "darwin") {
    const opener = spawn("open", [url], { stdio: "ignore" });
    opener.on("error", () => console.log("请在浏览器打开上方地址。"));
  }
}
if (await ownServerReady()) { openPage(); process.exit(0); }
try { migrateLocal(); } catch (error) { console.error(error.message); process.exit(1); }
console.log("正在启动取餐有约；按 Control+C 停止，数据保留在本机。\n");
const child = spawn(process.execPath, ["scripts/run-framework.mjs", "dev"], { stdio: "inherit", env: process.env });
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopping = true; child.kill(signal); });
child.on("error", error => { console.error(error.message); process.exit(1); });
child.on("exit", code => process.exit(stopping ? 0 : (code ?? 1)));
const timer = setInterval(async () => { if (await ownServerReady()) { clearInterval(timer); openPage(); } }, 1200);
timer.unref();
