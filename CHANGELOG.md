# Changelog

> 周节奏（Friday ship）。每周末汇总：已交付 + 进行中 + 下周计划。

## v0.1.0-w5 · 2026-06-21

> 当前 active。W5 协议深化 + Lab 3/4 全部从骨架升级为真功能。

### 已交付

**协议层**

- `core/protocols/common/lifecycle.ts` —— `EventMeta` + `createRunMeta` + `makeEnricher` + `enrichAll`（djb2 hash sessionId）
- `core/protocols/ag-ui/mapper.ts` —— `createAguiStatefulAdapter(sink?)` 合并 TOOL_CALL_START/ARGS/END lifecycle + `StatefulAdapterSink` 接口
- `core/protocols/a2ui/mapper.ts` —— `createA2uiStatefulAdapter()` 多 surface 树 + 增量 mount/patch + dataModel 浅 merge + `snapshot()`
- `core/engine/json-ui/apply.ts` —— `applyJsonUiPatch(doc, patch)` 前后端共用，修 3 个真 bug（mount 单层 path 解析 / patchNode mutate 原 doc / 终点判定错）
- `core/protocols/common/types.ts` —— `ToolChunk.error?` 字段

**Lab 3 Workbench**（4/4 真功能）

- 3.1.1 Three-pane：3 栏 CSS Grid + scenario chips + 模拟 SSE 流 + 实时 JsonUiRenderer
- 3.1.2 Inspector：3 树切换 + onHover 节点高亮 DSL 源码 + 钉住 + 节点 props 详情
- 3.1.3 Heatmap：3 kind（ERROR/WARN/INFO）+ severity 0-1 + 模拟事件流
- 3.1.4 Replay：scrubber + 6 按钮 + 速度 0.5x-4x + 导出导入 JSON dump

**Lab 4 Observability**（4/4 真功能）

- 4.1.1 Tokens：4 KPI + 2 SVG 图表（TTFT sparkline / 累积成本 area）+ 模型成本表 + 6 颜色 provider 调色板
- 4.1.2 Tools：3 栏（waterfall + raw events + inspector）+ createAguiStatefulAdapter 真接
- 4.1.3 Reasoning：3 patterns（CoT / ReAct / Plan）+ SVG DAG 自动布局 + scrubber + 导出 .md
- 4.1.4 Score：prompt select + 13 model 切换 + 4 维启发式评分 + SVG 雷达图 + 横向对比表

**Model registry 升级**

- `ModelInfo.costPerMillionInput` / `costPerMillionOutput` 字段
- 13 BUILTIN_MODELS 加 2026 实际 USD 价格（gpt-4o-mini \$0.15/\$0.60, claude-sonnet-4-5 \$3/\$15 等）
- Ollama 本地 = \$0

**JsonUiRenderer 升级**

- 注入 `data-jsonui-path` attribute on every node
- `PathCtx` Context（onHover / onSelect / highlightPath）
- a11y `role="treeitem"` for table / chart

**测试**

- **120 vitest tests**（68 → 120，+52：lifecycle 12 + ag-ui-stateful 10 + a2ui-stateful 13 + json-ui-apply 17）

### 已知问题

（全部关闭 ✓ 详见 §10.7）

- ~~sessionsLog IndexedDB 升级~~ → opt-in IDB module + localStorage fallback（`7a7c5f0`）
- ~~heatmap overlay div visual outline~~ → PathWrap outlineForPath API（`1e5422a`）
- ~~真 deepseek 端到端 e2e 自动化~~ → tests/manual/e2e-chat.ts（`2f5f80a`）
- ~~GitHub Actions CI~~ → .github/workflows/verify.yml（`1896cf9`）

W6+ 候选：
- Lab 1 真 LLM 接入（除 markdown /api/chat 外）→ **已实测 ✓** 真 deepseek 通过 /api/chat → markdown page → react-markdown 渲染
- Lab 2 加 agent 化（tool calling）
- A2UI 多 surface 编排 UI（surface 切换 + 手动 add/delete/clear all 已加）
- 真 Playwright 浏览器 e2e（替代 manual curl）

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
