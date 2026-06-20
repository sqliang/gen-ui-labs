# Changelog

> 周节奏（Friday ship）。每周末汇总：已交付 + 进行中 + 下周计划。

## v0.1.0-w4 · 2026-06-20

> 当前 active。站点感觉像真产品了：顶栏模型选择器 / 主题切换 / ⌘K 命令面板 / footer / 404 / about / settings。

### 已交付

- **视觉** · 首页 + 4 个 Lab hub + 7 个子页 + settings 全部统一到 LabHub / LabContentPage 外壳，深色 Devtool 风格
- **顶栏**（全站） · model 切换（13 模型 / 6 provider 分组）+ 主题切换（dark/light）+ ⌘K command palette + about 链接
- **footer**（全站） · 4 列（brand / labs / resources / stack）+ 底部 copyright / github / issue / releases
- **/about** · manifesto + 6 design principles + 12-week roadmap（done/wip/planned 三态）
- **/settings/models** · 6 provider 状态总览（实时 from /api/keys）+ 13 模型按 provider 分组 + .env.local 模板
- **/404** · 品牌化 404 页（4 Lab 入口 + CTA）
- **error boundary** · 全局 error.tsx（digest 显示 + retry + back-to-home）
- **/api/keys** · 6 provider 配置状态（不返回 key 本身）
- **/api/health** · {ok, ts, version, labs}
- **/api/models** · builtin model 列表
- **JSON-UI 表达式** · `{user.name}` / `{a.b.c}` 自动替换为 state 实际值（缺值保留原样）
- **JSON-UI chart** · 真 bar / line chart 渲染（之前是 📊 placeholder）
- **W9-W12 子页** · 8 个骨架（3.1.1-3.1.4 + 4.1.1-4.1.4），每个带真数据预览（features + dependsOn）
- **markdown 渲染** · 4 暗色 prose 颜色（heading / blockquote / code / link）
- **dead code 清理** · 删 `lab-overview.tsx` + `lab-topbar.tsx`（合并进 SiteHeader）
- **68 vitest tests** · 全绿

### 已知问题

- chart 节点 patch path 含数组下标时，applyPatch 还没正确处理（mock 用静态 mount 跑得通，但动态 patch 改 chart 数值不行）
- /api/ag-ui 仍是写死 mock（虽然 aguiAdapter 真在用，路径是"events → adapter → store → 渲染"）
- ⌘K 快捷键在 input 内被吞（预期行为，文本框里不该触发全局快捷键）

## v0.1.0-w3 · 2026-06-12

- Markdown 流式协议端到端跑通（react-markdown + 暗色 prose）
- JSON-UI 引擎 8 类节点（card / table / button / text / flex / grid / chart / input）
- A2UI v0.2 protocol adapter 真实现（surfaceUpdate / dataModelUpdate / beginRendering / dismissSurface）

## v0.1.0-w2 · 2026-06-05

- 13 model × 6 provider registry
- DeepSeek API key 配通，真 SSE 验证（899ms 首 token，26 chunks）
- 4 个 streaming + 4 个 mock 路由（/api/chat, /api/ag-ui, /api/a2ui, /api/json-ui）
- Zustand 5 个 store（ui / session / streaming / workbench / observability）

## v0.1.0-w1 · 2026-05-29

- Next.js 16 + React 19 + Tailwind v4 + shadcn/ui 脚手架
- 4 Lab 路由占位
- 基础主题（强制 dark）
