import { build } from "vite";
import { writeFile } from "node:fs/promises";
await build({ configFile: "vite.pages.config.ts" });
await writeFile("docs/.nojekyll", "");
console.log("GitHub Pages 静态演示已生成：docs/。不会包含后端密钥或本地数据库。");
