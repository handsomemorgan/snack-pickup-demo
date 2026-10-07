# 取餐有约 · 独立店铺预约自取 Demo

[在线体验](https://handsomemorgan.github.io/snack-pickup-demo/?tenant=template-shop&view=customer)

为单家店提供预约自取、商品维护和店铺页面设置。顾客只从本店链接进入；没有多店目录、跨店搜索或跨店购物车。服务管理员在独立管理入口管理租户与授权。

## 公开 Demo 的用法

- 店家演示密钥：`demo-shop`；超管演示密钥：`demo-admin`。这些是公开的模拟口令，不提供生产环境安全保障。
- 默认模板店：`?tenant=template-shop&view=customer`；模拟烤冷面店：`?tenant=demo-stall&view=customer`。
- 顾客：选商品、预约时段、使用虚构称呼建立预约，再查看取餐码和模拟票据。
- 店家：登录后新增商品、修改价格、上下架、选填图片，修改店名、介绍、封面与主题色。同一浏览器中的顾客端同步变化。
- 超管：查看模拟工作台心跳、创建模拟租户、签发和调整模拟 License。
- 每位访问者的数据仅存在自己的浏览器中；不同浏览器或设备之间不会同步。刷新可保留，清除浏览器数据后会丢失；页面提供重置功能。

**这是项目功能演示，不进行真实交易。** 不连接支付宝、商户设备、打印机或服务器数据库；不要真实付款，不要输入真实个人信息。公开版的权限、License 和心跳均由浏览器模拟，可被浏览器用户修改，不能作为营业系统。

## GitHub Pages 构建

Node.js >= 22.13，已使用 24.19 验证：

```sh
npm ci
npm run build:pages
npm run preview:pages
```

默认地址路径为 `/snack-pickup-demo/`。更换仓库名称时，构建前设置 `PAGES_BASE=/新仓库名/`。`static-demo/` 是静态入口，`lib/browser-demo.ts` 提供浏览器模拟数据，`docs/` 为预构建网页，并包含 `.nojekyll`。在仓库 Settings → Pages 选择 main 分支的 `/docs`；修改后需要重新构建并提交 `docs/`。

GitHub Pages 用于这个公开功能演示；实际营业需要单独部署后端、数据库和安全鉴权。参考 [GitHub Pages 使用限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。

## 本地后端版本

源码同时保留本地服务端版本，使用本机数据库、独立租户密钥和服务端签名授权。见 [本地开发说明](LOCAL_DEVELOPMENT.md)。它与公开浏览器模拟版不同。仓库不包含实际运行密钥、数据库或商户资料。

## 验证

```sh
npx tsc --noEmit
npm run build
node tests/browser-demo-checks.mjs
```

公开模拟版的 19 项检查覆盖商品同步、租户操作边界、订单价格快照、重复提交、到期授权与浏览器存储隔离；见 `tests/browser-demo-validation-report.json`。这些检查不证明真实支付或硬件可用。

## 来源与范围

界面使用 React、shadcn 组件；本地服务基于 Vinext、Cloudflare 本地运行组件和 Drizzle。保留已有组件及依赖许可；`vendor/` 与 `build/` 附带相应原始许可。餐品示意图由 AI 生成，非商户实拍。代码和界面由 Codex 辅助开发。

独立店铺入口和资金直接进入商户账户是产品设计选择，不构成免办 EDI、备案或其他许可的法律结论；实际要求仍应按运营行为、主体和部署方式确认。
