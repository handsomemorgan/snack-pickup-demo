import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
export function migrateLocal() {
  if (!existsSync("dist/server/wrangler.json")) {
    console.log("首次准备本地运行配置…");
    const build = spawnSync(process.execPath, ["scripts/run-framework.mjs", "build"], { stdio: "inherit" });
    if (build.status !== 0) throw new Error("本地构建未完成");
  }
  const args = ["--import", "./scripts/sites-env.mjs", "./node_modules/wrangler/bin/wrangler.js", "d1", "execute", "DB", "--local", "--config", "dist/server/wrangler.json", "--persist-to", ".wrangler/state"];
  function columns(table) {
    const r = spawnSync(process.execPath, [...args, "--command", `PRAGMA table_info(${table})`, "--json"], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr || "读取本地数据库失败");
    return JSON.parse(r.stdout).flatMap(item => item.results || []).map(row => row.name);
  }
  function apply(file) {
    console.log("准备本地数据结构：" + file);
    const r = spawnSync(process.execPath, [...args, "--file", file], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("数据升级未完成；原数据保留，请查看以上提示");
  }
  const merchantColumns = columns("merchants");
  if (!merchantColumns.length) apply("drizzle/0000_freezing_firebird.sql");
  if (!columns("merchants").includes("login_key_hash")) apply("drizzle/0001_famous_malice.sql");
  if (!columns("merchants").includes("contact_phone")) apply("drizzle/0002_store_contact.sql");
  if (!columns("products").includes("image_data")) throw new Error("本地数据结构不完整，请按README恢复数据库备份");
}
if (process.argv[1]?.endsWith("migrate-local.mjs")) migrateLocal();
