# GenUI Labs — 项目方案

> 一个面向 **生成式 UI（Generative UI）** 的实验性工作台：覆盖 UI 协议流式渲染、LLM 生成 UI 代码 / DSL、渲染引擎调试与 Agent 可观测性。
>
> 目标不是做产品，而是把 GenUI 的几个核心问题拆成可独立实验的模块，每个模块都"能看到结果、能调参数、能复现"。

---

## 0. 顶层定位

我们用一句话定义本项目的研究范围：

> **GenUI = 协议驱动的流式 UI 渲染 + LLM 驱动的 UI 代码/DSL 生成 + 可调试的渲染与 Agent 工作台**

围绕这三点，整体系统可以被拆成 4 个并列的实验区 + 1 个共享内核：

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          GenUI Labs Workspace                           │
├──────────────┬──────────────┬────────────────┬──────────────┬────────────┤
│ Lab 1        │ Lab 2        │ Lab 3          │ Lab 4        │ Shared Core│
│ Streaming    │ Gen Code     │ Engine         │ Agent        │ - 模型路由  │
│ UI 协议      │ & DSL        │ Debug Workb.   │ Observability│ - 协议定义  │
│ (AG-UI /     │ (Artifac.    │ (Artifac.      │ (Token/Tool/ │ - 组件注册表│
│  A2UI /      │  /DSL/LCDP)  │  + Inspector)  │  Reaso/评分) │ - Session  │
│  Markdown)   │              │                │              │ - Theming  │
└──────────────┴──────────────┴────────────────┴──────────────┴────────────┘
```

- **Lab 1 Streaming UI Protocols**：研究"流式协议 → UI"的渲染路径
- **Lab 2 Generate UI Code & DSL**：研究"LLM 输出 UI 描述"的多形态
- **Lab 3 Engine Debug Workbench**：研究"左 DSL / 右渲染 + 过程可视化"调试台
- **Lab 4 Agent Observability**：研究"Agent 推理过程、token、工具调用、UI 评分"的可观测性
- **Shared Core**：把模型、协议、组件、session 这些横切关注点收敛到内核

---

## 1. 功能设计

### 1.1 四个 Lab 的功能拆解

#### Lab 1 — Streaming UI Protocols（协议流式渲染）

把 LLM / Agent 的输出"边生成边渲染"，比较不同协议与渲染策略。

| 子功能 | 描述 | 关键技术点 |
| --- | --- | --- |
| 1.1.1 Markdown 流式渲染 | LLM 输出 Markdown，前端基于 SSE/WS 流式增量解析渲染 | `react-markdown` + `remark-gfm`，按 chunk 替换节点 |
| 1.1.2 AG-UI 协议流式渲染 | 实现一个 AG-UI 协议解析器，支持组件事件（`TEXT_MESSAGE_CONTENT` / `TOOL_CALL_START` / `STATE_DELTA` …） | 自研 `ag-ui` 客户端 reducer + 组件映射表 |
| 1.1.3 A2UI 协议渲染 | 按 A2UI v0.2 规范解析 `surfaceUpdate` / `dataModelUpdate` 等消息，还原 JSON-UI | 自研 A2UI 客户端 + 原子组件库 |
| 1.1.4 协议对照台 | 同一条 prompt，分别用 AG-UI / A2UI / Markdown 三路流式渲染，肉眼对比差异 | 复用 Lab 1.1.1~1.1.3 |
| 1.1.5 回放与时间轴 | 录制一次会话的协议事件流，提供 scrubber 时间轴回放 | IndexedDB / sessionStorage + 自研时间轴组件 |

#### Lab 2 — Generate UI Code & DSL（UI 代码 / DSL 生成）

研究 LLM 产出 UI 的两种典型形态——**直接可执行代码** vs. **DSL → 引擎渲染**。

| 子功能 | 描述 | 关键技术点 |
| --- | --- | --- |
| 2.1.1 React/TSX 代码生成 | LLM 输出 TSX 字符串，运行时沙箱编译（`@babel/standalone` 或 Sucrase）并通过 `new Function` / iframe 注入执行 | iframe 沙箱 + 错误隔离 + 热替换 |
| 2.1.2 JSON-UI DSL 生成 | LLM 输出结构化 JSON（树形组件），前端映射到本地组件树渲染 | Zod schema + JSON Schema 校验 + 组件字典 |
| 2.1.3 混合：DSL + 自由代码 | 顶层用 DSL 描述布局/数据流，叶子节点允许内联小段 JSX | 协议扩展 + 双解释器 |
| 2.1.4 低代码（LCDP）引擎渲染 | 把 DSL 视作"低代码页面定义"，实现属性面板 / 数据源绑定 / 事件编排 | 表单驱动 + 表达式引擎（jexl / expr-eval） |
| 2.1.5 代码 → DSL 反向 | 把生成的 TSX 解析回 DSL，方便后续用 Lab 3 调试 | Babel AST → DSL IR（自研） |
| 2.1.6 多模型对比 | 同 prompt 用 GPT-4.1 / Claude Sonnet / Qwen / DeepSeek 等生成，统一渲染对比 | 模型路由 + 评分卡 |

#### Lab 3 — Engine Debug Workbench（引擎调试台）

> 这就是你说的 "Artifact 效果"——左源码/DSL、右渲染，中间夹一个过程面板。

| 子功能 | 描述 | 关键技术点 |
| --- | --- | --- |
| 3.1.1 三栏 Workbench | 左：DSL / TSX 源码（带行号、错误下划线）；中：过程事件；右：实时渲染 | `react-resizable-panels` |
| 3.1.2 节点 Inspector | 选中渲染区域，定位到 DSL/TSX 节点，反向高亮源码 | Shadow DOM 拾取 + 数据 attribute 标注节点 ID |
| 3.1.3 错误热力图 | 把渲染异常（运行时报错、布局错位）叠加在源码上 | 自研 overlay 层 |
| 3.1.4 协议解码器 | 把 Lab 1 的事件流解码成"加了什么节点 / 改了什么属性"的 diff | patch-based diff（jsondiffpatch / 微内核） |
| 3.1.5 重渲染追踪 | React Profiler + 自研事件环，展示每个组件的渲染耗时 | `<Profiler>` API + 自研 ring buffer |
| 3.1.6 离线 Replay | 导入一次会话的 dump（事件 + 源码 + 中间态），完全离线重放 | `Replay` 模式 / `nohup`-like 注入 |

#### Lab 4 — Agent Observability（Agent 可观测性 + 评分）

> AI 生成 UI 的过程是黑盒的，这个 Lab 把它打开来看。

| 子功能 | 描述 | 关键技术点 |
| --- | --- | --- |
| 4.1.1 推理流可视化 | 思维链、ReAct、Plan-and-Execute 三种模式切换展示 | DAG 渲染（`@xyflow/react`） |
| 4.1.2 Token 消耗仪表 | 按模型/工具/阶段拆分的 token 成本、延迟、首 token 延迟 | 流式累记 + 折线图（recharts） |
| 4.1.3 工具调用回放 | 每次工具调用展示参数、结果、耗时、是否 retry | 时间轴 + JSON viewer |
| 4.1.4 UI 评分 | 人工评分（likert 1–5）+ 自动指标（可访问性 a11y、对比度、组件多样性、a11y tree 合理性） | `@axe-core/react` + 自研 rubric |
| 4.1.5 失败模式库 | 收集典型失败：组件超界、循环依赖、XSS、不可达交互… | 失败模板 + 一键 reproduce |
| 4.1.6 Prompt Lab | 同一任务多 prompt 对比，沉淀"好 prompt"模板 | prompt 模板 DSL + 变量插值 |

### 1.2 横切功能

- **会话管理**：左侧 session 列表，支持命名、tag、fork、导出 dump
- **多模型路由**：统一 `ModelProvider` 接口，支持 OpenAI / Anthropic / Google / 国产 / Ollama 本地
- **主题与品牌**：内置 Lab 风、极简风、暗色高对比（带 a11y 标注）
- **可插拔组件库**：把 shadcn/ui 的组件做一层薄包装，让协议/DSL 也能引用
- **导入/导出**：会话、DSL、协议事件 dump 可一键导出（用于离线 replay）
- **快捷键与命令面板**：`⌘K` 调起，做"快速进入某 Lab"

---

## 2. 模块设计

### 2.1 模块分层

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Apps 层   (Next.js App Router 路由)                                    │
│    /  /labs/streaming  /labs/codegen  /labs/workbench  ...              │
├──────────────────────────────────────────────────────────────────────────┤
│  Views 层 (页面级 UI / 业务编排)                                        │
│    StreamingLabView  CodegenLabView  WorkbenchView  ...                 │
├──────────────────────────────────────────────────────────────────────────┤
│  Features 层 (按 Lab 拆的功能模块)                                      │
│    features/streaming  features/codegen  features/workbench             │
│    features/observability                                                │
├──────────────────────────────────────────────────────────────────────────┤
│  Core 层 (协议/引擎/可观测/模型路由)                                    │
│    core/protocols  core/engine  core/agent  core/eval                   │
│    core/models  core/components  core/session                           │
├──────────────────────────────────────────────────────────────────────────┤
│  UI 层 (shadcn/ui + 基础控件 + 主题)                                    │
│    ui/  themes/  tokens/                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│  Infra 层 (工具/网络/存储)                                              │
│    infra/http  infra/storage  infra/log  infra/flags                    │
└──────────────────────────────────────────────────────────────────────────┘
```

依赖方向：**Apps → Views → Features → Core → UI / Infra**。Core 不知道 Labs 的存在，Features 之间通过 Core 通信，禁止相互 import。

### 2.2 核心模块拆解

#### `core/protocols` —— 协议层

- `protocols/ag-ui/`：AG-UI 事件类型、reducer、组件映射
- `protocols/a2ui/`：A2UI v0.2 schema、客户端 reducer
- `protocols/markdown/`：基于 `remark` 的流式分块解析
- `protocols/json-ui/`：内部 JSON-UI DSL（Lab 2 主用）
- `protocols/common/`：`StreamChunk`、`ComponentPatch`、`StateDelta` 等公共类型

所有协议统一抽象成 `RenderableEvent`：

```ts
type RenderableEvent =
  | { kind: 'text'; delta: string; path?: NodePath }
  | { kind: 'component'; op: 'mount' | 'patch' | 'unmount'; id: string; spec?: ComponentSpec; patch?: Patch }
  | { kind: 'state'; path: string; value: unknown }
  | { kind: 'tool'; name: string; args: unknown; result?: unknown }
  | { kind: 'control'; type: 'start' | 'end' | 'error'; meta?: unknown }
```

#### `core/engine` —— 渲染引擎

- `engine/json-ui/`：JSON-UI → React 树（核心）
- `engine/sandbox/`：iframe 沙箱 + postMessage 协议（跑生成的 TSX）
- `engine/expression/`：表达式求值（`@expry/expr-eval`），支撑数据绑定
- `engine/layout/`：flex/grid 布局原语
- `engine/reconciler/`：patch-based 增量更新，承接流式协议事件

#### `core/agent` —— Agent 运行时

- `agent/runtime/`：通用 Agent loop（Observe → Think → Act → Observe）
- `agent/patterns/`：ReAct / Plan-Execute / Reflection / Tool-Use 模板
- `agent/tools/`：内置工具（`render_component`、`update_state`、`query_user` 等）
- `agent/prompts/`：模板化 prompt，支持变量和 few-shot 注入

#### `core/models` —— 模型路由

```ts
interface ModelProvider {
  id: string
  listModels(): Promise<ModelInfo[]>
  stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<StreamChunk>
  generate(req: ChatRequest): Promise<ChatResponse>
}
```

内置：OpenAI、Anthropic、Google、DeepSeek、Qwen（DashScope）、Ollama（本地）。

#### `core/eval` —— 评分与可观测

- `eval/a11y/`：基于 `@axe-core/react`
- `eval/metrics/`：组件多样性、布局合理性、交互可达性
- `eval/scoring/`：人工评分 + 自动评分聚合
- `eval/tokens/`：按阶段、模型、工具切分 token 成本

#### `core/session` —— 会话与回放

- `session/store/`：基于 IndexedDB（idb-keyval）的会话存储
- `session/replay/`：把事件流 + 源码 + 中间态打包成 `.genui-dump`，可重放
- `session/fork/`：会话分叉

#### `core/components` —— 组件注册表

- 内置 shadcn/ui 组件（Card、Button、Table、Tabs、Dialog…）
- A2UI 原子组件（Text、Image、Row、Column、Button…）
- 协议组件映射：`AGUIButton → shadcn Button`
- 业务自定义组件可在 `app/(labs)/_components/` 下注册

### 2.3 路由与页面

```
app/
├─ (home)/page.tsx                    # 工作台首页：四个 Lab 入口 + 最近会话
├─ (labs)/
│   ├─ layout.tsx                     # Lab 通用壳：左侧 session、顶部模型选择
│   ├─ streaming/
│   │   ├─ page.tsx                   # Lab 1 总览
│   │   ├─ markdown/page.tsx
│   │   ├─ ag-ui/page.tsx
│   │   ├─ a2ui/page.tsx
│   │   └─ compare/page.tsx           # 协议对照台
│   ├─ codegen/
│   │   ├─ page.tsx                   # Lab 2 总览
│   │   ├─ tsx/page.tsx               # 直接生成 TSX
│   │   ├─ dsl/page.tsx               # 生成 JSON-UI DSL
│   │   ├─ lcdp/page.tsx              # 低代码调试
│   │   └─ reverse/page.tsx           # TSX → DSL 反向
│   ├─ workbench/
│   │   ├─ page.tsx                   # Lab 3 总览
│   │   └─ [sessionId]/page.tsx       # 三栏调试台
│   └─ observability/
│       ├─ page.tsx
│       ├─ trace/[sessionId]/page.tsx
│       └─ eval/page.tsx
├─ api/
│   ├─ chat/route.ts                  # 通用聊天 SSE
│   ├─ ag-ui/route.ts                 # AG-UI 协议端点
│   ├─ a2ui/route.ts                  # A2UI 协议端点
│   ├─ eval/route.ts                  # 评分接口
│   └─ replay/route.ts                # 会话回放
└─ settings/
    ├─ models/page.tsx
    ├─ prompts/page.tsx
    └─ themes/page.tsx
```

---

## 3. 技术栈与项目目录结构

### 3.1 技术栈选型

| 层 | 选型 | 理由 |
| --- | --- | --- |
所有依赖锁定 **npm `latest` tag** 的当前版本（截至 2026-06）；CI 中用 `npm view <pkg> version` 校对。

| 层 | 选型（@ 版本） | 理由 |
| --- | --- | --- |
| 框架 | **Next.js 16.2.7（App Router）+ React 19.2.7** | RSC + Server Actions + Edge Runtime 都能用，路由清晰；Next.js 16 已 GA |
| 语言 | **TypeScript 6.0.3（strict）** | 全栈类型化 |
| 样式 | **Tailwind CSS 4.3.0** + **CSS Variables** + `@tailwindcss/postcss` | token 化主题，暗色零成本 |
| 组件库 | **shadcn/ui**（Radix 1.1.x + Tailwind 4.3 + `class-variance-authority` 0.7.1 + `clsx` 2.1.1 + `tailwind-merge` 3.6.0 + `lucide-react` 1.17.0） | Tailwind 原生、可复制可改、无版本锁 |
| 头部 | **App Router + RSC + Server Actions** | 协议流用 RSC streaming |
| 状态 | **Zustand 5.0.14**（仅承担"跨组件 + 高频 + 不走 URL"的客户端态） | 见 §9 分层状态管理原则 |
| 数据获取 | **@tanstack/react-query 5.101.0**（如果需要缓存） | 视 Lab 4 仪表盘而定 |

> **状态管理的核心思路**：不要"装一个 Zustand 管所有东西"。Next.js App Router 已经覆盖了大多数状态场景（Server Component 的 RSC、URL 的 searchParams、Server Actions），Zustand 只补最后一块短板——跨组件、高频、不入 URL 的纯客户端态。
| 协议流 | **SSE（`ReadableStream`）+ WebSocket** | SSE 默认，WS 备选 |
| Markdown | **react-markdown 10.1.0 + remark-gfm 4.0.1 + rehype-raw 7.0.0 + rehype-sanitize 6.0.0** | 流式 + 安全 |
| 代码高亮 | **Shiki 4.2.0**（SSR 友好，主题多） | 暗色主题一致 |
| 表达式 | **expr-eval 2.0.2** 或 **@expry/expr** | DSL 数据绑定 |
| 沙箱 | **iframe + `postMessage`** + `@babel/standalone 7.29.7` | 跑生成的 TSX |
| 工作台布局 | **react-resizable-panels 4.11.2** | 三栏可拖拽 |
| 流程图 | **@xyflow/react 12.11.0** | 推理 DAG |
| 图表 | **recharts 3.8.1** | token 折线图 |
| JSON diff | **jsondiffpatch 0.7.6** | 协议解码器 diff |
| 表单 | **react-hook-form 7.78.0 + zod 4.4.3** | 设置 / Prompt Lab；zod v4 API 已稳定 |
| IndexedDB | **idb-keyval 6.2.5** | session 存储 |
| 测试 | **Vitest 4.1.8 + @testing-library/react 16.3.2 + @playwright/test 1.60.0** | 单元 + e2e |
| Lint/Format | **@biomejs/biome 2.4.16**（单仓统一） | 速度优于 ESLint+Prettier 组合 |
| 监控 | 自研事件总线 + Web Vitals | 不接第三方 |

> **依赖更新策略**：本项目所有依赖**始终取 npm `latest` tag**。新 session 起步时跑一次 `npm view <pkg> version`，把数字落到 README 的依赖表里，再用 `npm install <pkg>@latest`。CI 用 `npm outdated` 巡检。

### 3.2 项目目录结构

```
gen-ui-labs/
├─ app/                              # Next.js App Router
│   ├─ (home)/page.tsx
│   ├─ (labs)/
│   │   ├─ layout.tsx
│   │   ├─ streaming/
│   │   ├─ codegen/
│   │   ├─ workbench/
│   │   └─ observability/
│   ├─ api/
│   │   ├─ chat/
│   │   ├─ ag-ui/
│   │   ├─ a2ui/
│   │   ├─ eval/
│   │   └─ replay/
│   └─ settings/
│
├─ src/
│   ├─ core/
│   │   ├─ protocols/
│   │   │   ├─ ag-ui/
│   │   │   ├─ a2ui/
│   │   │   ├─ markdown/
│   │   │   ├─ json-ui/
│   │   │   └─ common/
│   │   ├─ engine/
│   │   │   ├─ json-ui/               # 核心: JSON-UI → React
│   │   │   ├─ sandbox/               # iframe 沙箱
│   │   │   ├─ expression/            # 表达式求值
│   │   │   ├─ layout/                # 布局原语
│   │   │   └─ reconciler/            # 增量更新
│   │   ├─ agent/
│   │   │   ├─ runtime/               # Agent loop
│   │   │   ├─ patterns/              # ReAct/Plan/Reflect
│   │   │   ├─ tools/                 # 工具集
│   │   │   └─ prompts/               # 提示词模板
│   │   ├─ models/                    # 多模型 provider
│   │   ├─ eval/                      # 评分与 a11y
│   │   ├─ components/                # 组件注册表
│   │   └─ session/                   # 会话/回放/fork
│   │
│   ├─ features/
│   │   ├─ streaming/
│   │   ├─ codegen/
│   │   ├─ workbench/
│   │   └─ observability/
│   │
│   ├─ views/                         # 页面级 UI 编排
│   │
│   ├─ ui/                            # shadcn/ui 基础控件
│   │   ├─ button.tsx
│   │   ├─ card.tsx
│   │   ├─ panel.tsx                  # 三栏 workbench panel
│   │   ├─ timeline.tsx               # 事件时间轴
│   │   ├─ inspector.tsx              # 节点 inspector
│   │   └─ ...
│   │
│   ├─ themes/                        # 主题 + token
│   │   ├─ tokens.css                 # CSS 变量
│   │   ├─ lab.css
│   │   └─ dark.css
│   │
│   ├─ infra/
│   │   ├─ http/                      # fetch 封装 + SSE
│   │   ├─ storage/                   # IndexedDB
│   │   ├─ log/                       # 事件总线
│   │   └─ flags/                     # feature flag
│   │
│   └─ lib/                           # 工具函数（cn、formatDate...）
│
├─ public/
├─ styles/
│   └─ globals.css
│
├─ tests/
│   ├─ unit/                          # vitest
│   └─ e2e/                           # playwright
│
├─ scripts/                           # 一次性脚本
├─ .env.example
├─ biome.json
├─ next.config.mjs
├─ tailwind.config.ts
├─ tsconfig.json
├─ package.json
└─ README.md
```

### 3.3 关键目录的额外说明

- **`src/core/protocols`**：每个协议一个文件夹，对外暴露 `parse`、`reducer`、`ComponentMap`。
- **`src/core/engine/json-ui`**：本项目最重要的引擎。给定 `JsonUiNode` 树，返回 React 组件。增量更新走 `reconciler`。
- **`src/core/agent/runtime`**：可独立用 Vitest 跑——给定 prompt + tools，产出事件流。
- **`src/ui/panel.tsx`**：基于 `react-resizable-panels` 封装的 `<Workbench left center right>`，所有 Lab 复用。

---

## 4. 开发节奏建议（12 周拆解）

> 偏激进，可按 Lab 优先级调整。

| 周 | 目标 | 交付物 |
| --- | --- | --- |
| W1 | 脚手架 + shadcn/ui + 主题 token + 首页骨架 | 可跑的 Next.js 项目 |
| W2 | `core/models` + SSE 通道 + 通用聊天页 | 流式 chat 通 |
| W3 | `core/protocols/markdown` + Lab 1.1.1 | Markdown 流式 |
| W4 | `core/protocols/ag-ui` + Lab 1.1.2 | AG-UI 渲染 |
| W5 | `core/protocols/a2ui` + Lab 1.1.3 + 协议对照台 | Lab 1 完整 |
| W6 | `core/engine/json-ui` 基础版 + Lab 2.1.2 | JSON-UI DSL 渲染 |
| W7 | Lab 2.1.1（TSX 沙箱）+ Lab 2.1.3（混合） | 直接生成代码 |
| W8 | `core/agent/runtime` + ReAct/Plan 模式 | 基础 Agent |
| W9 | `core/session` + 回放 + Lab 3.1.1 三栏 Workbench | Debug Workbench |
| W10 | Lab 3.1.2~1.5（Inspector / 错误热力 / Replay） | Workbench 完善 |
| W11 | `core/eval` + Lab 4（token、工具、评分） | 可观测 |
| W12 | Prompt Lab + 失败模式库 + README / 文档 | 收尾 |

---

## 5. 风险与待决问题

1. **AG-UI / A2UI 规范还在演进**：协议层要做版本探测和兼容性层。
2. **iframe 沙箱性能**：大体积 TSX 编译会卡；考虑 worker 化 `@babel/standalone`。
3. **多模型路由一致性**：不同模型的 streaming 语义不一样，需要在 `core/models` 做规范化。
4. **可观测数据的存储成本**：每会话全量事件流会很大，建议分 Lab 提供"详细 / 摘要"两种粒度。
5. **生成代码的安全**：必须 iframe 沙箱 + CSP + 严格 message 协议，不允许 inline eval。
6. **DSL 的可表达力上限**：避免一上来就"图灵完备"，先做"够用"，再迭代。
7. **A2UI 原子组件与 shadcn 组件的对齐**：先映射再扩展，别一上来就 50 个组件。

---

## 6. 关键设计原则（写进 README 也行）

- **可观测优先**：所有实验都要能"回放"。没有 replay 的实验不算实验。
- **协议先行**：UI 描述先抽象成事件流，渲染是事件流的投影。
- **Lab 隔离**：每个 Lab 自包含可独立运行，共享 Core 但不互相耦合。
- **DSL 渐进**：从 JSON-UI 起，逐步引入表达式、状态、事件。**先能用，再好用**。
- **沙箱永远在线**：任何 LLM 生成的 UI 代码默认在隔离环境跑。
- **失败是数据**：失败模式库是核心资产，不是边角料。

---

## 9. 分层状态管理（避免 Zustand 滥用）

> **核心问题**：用了 Next.js 之后还需要不要 Zustand？答：**需要，但只承担一类状态**。
>
> Next.js App Router 已经覆盖了大多数状态场景；Zustand 只补"跨组件、高频、不入 URL 的纯客户端态"这一块短板。

### 9.1 Next.js 自带的状态承载

| 机制 | 适用 |
| --- | --- |
| **RSC（Server Component）** | 服务端数据，按请求渲染，靠 `fetch` cache 控制失效 |
| **Client Component + `useState` / `useReducer`** | 单组件临时态 |
| **Client Component + Context** | 跨组件但低频（注意：Context 重渲染粒度粗） |
| **URL `searchParams` / `pathname`** | 可分享 / 可前进后退的状态（当前路由、模型选择、过滤条件） |
| **TanStack Query / RSC fetch** | 服务端数据缓存、轮询、乐观更新 |
| **Server Actions + `useFormState`** | 写操作 |

### 9.2 GenUI Labs 的状态分类与归属

| 状态 | 归谁管 | 理由 |
| --- | --- | --- |
| 会话列表 / 当前 session 元数据 | **RSC + TanStack Query** | 服务端数据，按需缓存 |
| 当前 Lab 路由 / 模型选择 / 过滤条件 | **URL `searchParams`** | 可分享、可前进后退、可 SSR |
| **协议事件流**（Lab 1 SSE chunk） | **Zustand `streamingStore`** | 高频追加、跨面板订阅、不入 URL |
| **Lab 3 Workbench 三栏宽度 / 选中节点 / scrubber 位置** | **Zustand `workbenchStore`** | 高频拖拽 / 高频点击，不能写 URL |
| **Lab 4 实时 token 计数 / 工具调用日志** | **Zustand `observabilityStore`** | 高频追加，跨仪表盘面板订阅 |
| **全局 UI 偏好（主题、布局、命令面板开合）** | **Zustand + `persist` middleware** | 跨 Lab、全局生效 |
| 表单输入 | **`react-hook-form` 自带** | 不污染 store |
| 单组件临时态 | **`useState` / `useReducer`** | 不抽 store |
| 沙箱 iframe 内部状态 | **postMessage**（不进 store） | 沙箱自治 |

### 9.3 Store 划分（落地结构）

```
src/core/state/
├─ ui-store.ts             # 主题、命令面板、布局（persist → LocalStorage）
├─ session-store.ts        # 当前 sessionId、当前模型（URL 为主，store 缓存）
├─ streaming-store.ts      # 协议事件流（append-only，不持久化）
├─ workbench-store.ts      # Lab 3 三栏宽度、选中节点、scrubber
└─ observability-store.ts  # Lab 4 token、工具调用日志
```

每个 store 用 **selector 精准订阅**，避免 Context 那种"一变全变"的问题：

```ts
// 错误：订阅整个 store，任何字段变化都重渲
const { chunks, isStreaming } = useStreamingStore()

// 正确：每个字段独立 selector，只在该字段变化时重渲
const chunks = useStreamingStore(s => s.chunks)
const isStreaming = useStreamingStore(s => s.isStreaming)
```

### 9.4 何时不要 Zustand

- **能进 URL 的就进 URL**（searchParams / hash）。URL 是 Next.js 的一等公民，免费拿到可分享 + SSR + 前进后退
- **能用 RSC fetch 的就用 RSC**（默认就是 Server Component，别无脑 `"use client"`）
- **能用 `useState` 就别抽 store**（升一级组件 / prop drilling 通常比 store 更清晰）
- **能用 `react-hook-form` 的表单状态就别进全局 store**
- **只在"跨组件 + 高频 + 不入 URL"才用 Zustand**

### 9.5 反模式（要避开）

| 反模式 | 为什么坏 |
| --- | --- |
| 整个 App 一个大 store | 重渲染雪崩、selector 难写、团队协作冲突 |
| 把 URL 状态塞进 store | 失去分享性、SSR 不友好、刷新丢状态 |
| 把表单未提交值塞进 store | 用 `react-hook-form` 自带即可 |
| 用 Context 顶替 Zustand | Context 在高频更新下重渲染粒度粗 |
| 服务端数据进 Zustand | 那是 TanStack Query / RSC 的活，store 不知道缓存失效 |

---

## 10. W1 落地记录（2026-06-09）

> W1 脚手架已完成 ✅。下列内容已可运行：`npm run dev` / `build` / `typecheck` / `lint` / `test` 全部通过。

### 10.1 已完成的脚手架

| 项 | 状态 | 说明 |
| --- | --- | --- |
| Next.js 16.2.7（App Router + Turbopack） | ✅ | `params`/`searchParams` 全部 async |
| React 19.2.4 + React-DOM 19.2.4 | ✅ | Next.js 16 硬约束 |
| TypeScript 5.9.3（strict + noUncheckedIndexedAccess） | ✅ | TS6 暂不升 |
| Tailwind v4（CSS-first config + 暗色主题） | ✅ | zinc base color |
| shadcn/ui（手写 components.json + 4 个基础组件） | ✅ | Button / Card / Badge / Separator |
| Biome 2.4.16（替代 ESLint） | ✅ | format + lint + organize imports |
| Zustand 5（5 个 store） | ✅ | ui / session / streaming / workbench / observability |
| Vitest 4.1.8（jsdom + @testing-library/react） | ✅ | 1 个示例测试（4 用例） |
| API stub 端点（chat / ag-ui / a2ui / eval / replay） | ✅ | 返回 503 + 计划信息 |
| 4 个 Lab 总览页 + 1.1.1 Markdown 占位（可点击模拟流式） | ✅ | 其它子页签占位 |
| 首页（4 Lab 入口 + 最近会话） | ✅ | |
| (labs) 共用 layout（左侧 Lab 导航 + 顶部模型选择） | ✅ | |
| 主题切换（light / dark / system，跟随系统） | ✅ | `useUiStore.themeMode` + `<html class="dark">` |
| 路径别名 `@/*` → `./src/*` | ✅ | tsconfig + vitest.config 双侧 |
| 工程目录骨架（core/features/views/infra/lib） | ✅ | 每个 core 子目录有 README |

### 10.2 当前可运行命令

```bash
npm run dev         # 启动 Next dev server（默认 3000）
npm run build       # 生产构建（已验证，12 静态页 + 5 API 路由）
npm run typecheck   # tsc --noEmit（已验证，0 错误）
npm run lint        # Biome check（已验证，0 错误）
npm run lint:fix    # 自动修复
npm run format      # Biome format
npm run test        # Vitest 单次
npm run test:watch  # Vitest 监听
npm run check-deps  # 重校对 npm latest 版本
npm run typegen     # npx next typegen（生成 PageProps / LayoutProps 类型 helper）
```

### 10.3 W1 阶段验证

- `npx tsc --noEmit` → **0 errors**
- `npx biome check .` → **0 errors**（40 files checked）
- `npx vitest run` → **4/4 passed**
- `npx next build` → **Compiled in 1367ms**，12 静态页 + 5 API 路由全部成功
- `npx next dev` → **Ready in 217ms**，所有路由返回 200，API 端点返回 stub JSON

### 10.4 W1 → W2 衔接（已完成 ✅）

按 PROPOSAL.md §4 节奏，**W2 目标已全部完成**：

1. ✅ `core/models/`：实现 `ModelProvider` 接口 + 6 个 provider（OpenAI / Anthropic / Google / DeepSeek / Qwen / Ollama）
2. ✅ `infra/http/`：SSE 客户端封装（`fetchSse` / `parseSseResponse` / `parseSseEvent`）
3. ✅ `app/api/chat/route.ts` 真正实现：调用 `provider.stream()` + SSE 输出
4. ✅ `app/(labs)/streaming/markdown/page.tsx` 接入 `/api/chat`，保留「mock / api」双 source 对照
5. ✅ `core/state/session-store.ts` 接入 URL searchParams（`?model=xxx`），topbar 切换时 `history.replaceState` 同步 URL

**W2 新增能力**：

- `core/models/types.ts`：`ChatRequest` / `ChatResponse` / `StreamChunk` / `ModelInfo` / `ModelProvider` / `ModelProviderError`
- `core/models/registry.ts`：12+ 个内置模型清单，覆盖 6 个 provider
- `core/models/router.ts`：`getModelProvider(modelId)` factory + `BUILTIN_PROVIDERS` 注册表
- `core/models/providers/{openai,anthropic,google,deepseek,qwen,ollama}.ts`：6 个 stub provider（每个文件注释里说明 W3+ 真实 HTTP 接入点）
- `core/models/providers/mock-base.ts`：W2 阶段所有 provider 共用的 mock 流式引擎（200ms 首 token 延迟 + 30ms chunk 间隔）
- `infra/http/sse-client.ts`：`fetchSse` / `parseSseResponse` / `parseSseEvent` / `postJson`，支持 AbortSignal
- `views/sync-search-params.tsx`：URL ↔ session-store 单向同步 hook（mount 后生效，规避 Next.js 16 useSearchParams 的 CSR bailout）
- shadcn/ui 新增：`DropdownMenu`（按 provider 分组的模型选择器）
- AGENTS.md 重写：Next.js 16 breaking 清单 + 项目特定规则

**W2 测试覆盖（28 → 50 用例）**：

- `core/models.test.ts`：13 用例（registry / router / mock 流式 / generate / abort 中断）
- `infra/sse-client.test.ts`：9 用例（单事件 / 多事件 / event+id / 多行 data / 注释 / 跨 chunk / 非 200 报错 / POST body+headers / abort）
- `state/*.test.ts`：沿用 W1 polish，28 用例
- 总计 **50/50 passed**

**W2 阶段验证**：

- `npx tsc --noEmit` → **0 errors**
- `npx biome check .` → **0 errors**（62 files）
- `npx vitest run` → **50/50 passed**
- `npx next build` → **12 静态页 + 5 API 路由**，编译 1880ms
- `npx next dev` → Ready in **154ms**
- `curl /api/chat`（POST）→ SSE 流式响应（mock 数据）
- `curl /api/chat`（GET）→ 405 method_not_allowed + JSON 提示

**W2 → W3 衔接（已完成 ✅）**

按 PROPOSAL.md §4 节奏，**W3 目标已全部完成**：

1. ✅ react-markdown@10.1.0 + remark-gfm@4.0.1 + rehype-highlight@7.0.2 装好
2. ✅ core/render/markdown-renderer.tsx 抽象组件落地（流式 cursor / 代码高亮 / GFM）
3. ✅ OpenAI 兼容协议通用 client：core/models/providers/openai-compat.ts
4. ✅ 4 个真实 provider：OpenAI / DeepSeek / Qwen / Ollama（env-controlled）
5. ✅ Anthropic / Google 保留 mock（W4+ 接自家协议）
6. ✅ /api/chat 升级：Zod 校验 + request.signal abort + firstTokenLatencyMs / totalDurationMs meta
7. ✅ getModelProvider 未知 id：env-controlled（dev 静默，prod 抛错）
8. ✅ /api/chat 端到端验证：200 / 400 / 405 / SSE 全部按预期

**W3 新增能力**：

- `core/render/markdown-renderer.tsx`：通用 Markdown 渲染（react-markdown + remark-gfm + rehype-highlight + 流式 cursor）
- `core/models/providers/openai-compat.ts`：OpenAI 兼容协议通用 client，stream() / generate() 两个方法
- `core/models/providers/{openai,deepseek,qwen,ollama}.ts`：4 个真实 provider（W3 起按 env 控制，缺 key 抛错）
- `core/models/providers/{anthropic,google}.ts`：保留 mock（W4+ 接各自协议）
- `app/api/chat/schema.ts`：Zod 4 schema（chatRequestSchema）
- `app/api/chat/route.ts` 升级：Zod 校验 + request.signal abort + meta chunk（firstTokenLatencyMs / totalDurationMs）
- `core/state/streaming-store.ts`：`RenderableEvent.control.type` 加 `"meta"` 取值
- `core/models/router.ts`：getModelProvider 兜底改 env-controlled
- tsconfig：加 `esModuleInterop: true`（Zod 4 需要）

**W3 测试覆盖（50 → 56 用例）**：

- `core/openai-compat.test.ts`（新）：5 用例
  - 拆 OpenAI chunk → text events → end
  - 非 200 抛 ModelProviderError
  - model id 通过 modelMap 转换
  - finish_reason === "length" 正确结束
  - [DONE] 行解析（OpenAI 流的最后一行）
- `core/models.test.ts` 加 1 用例：prod 环境抛 ModelProviderError
- 其它测试沿用 W2

**W3 阶段验证**：

- `npx tsc --noEmit` → **0 errors**
- `npx biome check .` → **0 errors**（64 files）
- `npx vitest run` → **56/56 passed**
- `npx next build` → **12 静态页 + 5 API 路由**，编译 1661ms
- `npx next dev` → Ready in **180ms**
- `curl /api/chat`（GET）→ 405 method_not_allowed ✅
- `curl /api/chat`（POST bad body）→ 400 + Zod issues ✅
- `curl /api/chat`（POST valid）→ SSE 流式响应 + firstTokenLatencyMs=201ms ✅

**W3 关键决策**：

- 选 **OpenAI 兼容协议**作为 W3 真实接入面（OpenAI / DeepSeek / Qwen / Ollama 都走 OpenAI 兼容，Ollama 0.1.14+ 自带兼容端点）；Anthropic / Google 留 W4
- 真实 provider 的 **env 缺失时直接抛 ModelProviderError**（不再静默降级到 mock）
- /api/chat 路由用 Zod 4 校验，**让错误前置到 400**
- /api/chat 接 `request.signal`，**client abort 时 provider.stream 也会停**

**W3 → W4 衔接（W4-4 已完成 ✅）**

按 PROPOSAL.md §10.4，**W4-4（markdown 页全面升级）已完成**：

1. ✅ src/app/labs/streaming/markdown/page.tsx 全面重写
   - 接 /api/chat 真 SSE（fetchSse + AbortController + request.signal 透传）
   - 接 MarkdownRenderer（react-markdown v10 + GFM + rehype-highlight）
   - 4 个 preset（react demo / ag-ui / a2ui / json-ui）+ 自定义 prompt
   - mock / api 双 source 切换
   - 错误态：api 模式 env 缺失时显示错误卡
   - meta chunk 解析：firstTokenLatencyMs / totalDurationMs
   - 成功完成时 observability-store.addTokenUsage 落库（按 model 累计）
2. ✅ src/core/render/extract-metrics.ts：从 chunks 抽 firstTokenLatency / totalDuration
3. ✅ tests/unit/core/extract-metrics.test.ts：6 用例（空数组 / 第一个meta / 无meta / 非数字 / firstToken只取第一个 / totalDuration取最后一个）

**W4-4 验证**：

- `npx tsc --noEmit` → **0 errors**
- `npx biome check .` → **0 errors**（66 files）
- `npx vitest run` → **62/62 passed**（+6 from W3）
- `npx next build` → 12 静态页 + 5 API 路由
- `npx next dev` → Ready in **183ms**
- **dev 端到端**（curl + 浏览器）：
  - mock 模式：521 字符 / 67 chunks / H1+H2+粗体+列表+代码块+引用块全渲染
  - api 模式（claude-sonnet-4-5 + mock-base）：427 字符 / 57 chunks / 同样全渲染
  - api 模式（gpt-4o-mini + 无 env）：**红色错误卡显示「OPENAI_API_KEY not set」**——env-controlled 兜底验证成功
  - 切换模型：topbar 切换 → topbar 标签 / model badge 同步更新
  - 停止 / 清空按钮：enable/disable 状态正确

**W4-4 端到端**：用户在浏览器跑：

1. /labs/streaming/markdown → 看到完整 UI（4 preset + source 切换 + 自定义 prompt + 3 个操作按钮）
2. 选 mock → 点「开始流式渲染」→ 521 字符/67 chunks 边生成边渲染
3. 切到 api + 选 anthropic（走 mock-base）→ 427 字符/57 chunks
4. 切到 api + 选 openai（无 key）→ 红色错误卡
5. 顶部 topbar 切换模型 → 整页 model badge 同步

**W4 仍未完成的部分（建议 W4-5/6/7）：**

1. W4-1：接 Anthropic Messages API（自家 SSE 格式：content_block_delta 等）
2. W4-2：接 Google Gemini generateContent（URL query key + 嵌套 JSON SSE）
3. W4-3：AG-UI 协议层（core/protocols/common/）—— 拆 RenderableEvent
4. W4-7：lab-topbar.tsx 的 BUILTIN_MODELS 还引 session-store 的旧版（8 个），跟 core/models/registry 新版（13 个）不一致，**下次顺手统一**

**W3 review 已知 bug**：
| **W3 review 已知 bug**：
| markdown 页 W2 commit 写"完成"但实际文件没进 git（路径 `(labs)/` 被误删）
|  - **W4-4 已修**——文件现在真在 `src/app/labs/streaming/markdown/page.tsx`，完整接 SSE + 渲染

---

## 10.5 W4-5 → W4-末 落地（2026-06-20 · v0.1.0-w4）

> 本节汇总 W4 后续及 W4-末的所有站点级落地，从纯技术验证 → "像真产品" 的转折点。

### 已交付（按 ROI 排）

**P0 · 让站点像真产品**
- ✅ **首页重做**（深色 Devtool 风格 + 4 个 live mini-demo）—— 不再 shadcn 默认
- ✅ **4 个 Lab hub** 共享 `LabHub` 组件（LabHero + 进度面板 + 子页网格）
- ✅ **7 个子功能页** 共享 `LabContentPage` 外壳（header / toolbar / output）
- ✅ **顶栏**：模型选择器（13 个 / 6 provider）+ 主题切换 + ⌘K + about + src
- ✅ **真 footer**（4 列 + bottom bar）+ **真 not-found 页**（404 + 4 Lab 入口）+ **真 error boundary**
- ✅ **`/about` 页**（manifesto + 6 设计原则 + 12 周路线图 + 4 Lab 入口）
- ✅ **首页 stats 从 registry 派生**（自动同步新模型）

**P1 · 站点级基础设施**
- ✅ **`/settings/models`**：6 provider 状态总览（绿点=ready / 灰点=missing）+ 13 模型按 provider 分组 + `.env.local` 模板
- ✅ **⌘K 命令面板**：5 分组（labs / sub-pages / pages / actions / external）+ 键盘导航（↑↓ ↵ esc）+ 跨页跳转
- ✅ **`CHANGELOG.md`**：周节奏 v0.1.0-w4
- ✅ **`README.md`** 重写：4 Labs 表 + 30 秒上手 + ⌘K + 5 架构原则 + 目录树 + provider 表
- ✅ **`/api/keys`**：dev-only 诊断端点，返回 6 provider 配置状态（不返回 key 本身）
- ✅ **`.env.example`**：6 provider + get key 链接

**P2 · 协议层 + 真功能**
- ✅ **`/api/ag-ui` / `/api/a2ui`** 接收 `?prompt=xxx` 关键词触发不同事件流（search / write / json / table / chart / form）
- ✅ **JSON-UI 表达式求值**：`{user.name}` / `{a.b.c}` / `{a[0].b}` 自动替换 state 值（缺值保留原样）+ toggle Alice ↔ Carol
- ✅ **JSON-UI dataModelUpdate 模拟**：useReducer 维护 bindingState，按 path dispatch + rerender
- ✅ **8 个新子页骨架**（3.1.1-3.1.4 + 4.1.1-4.1.4）：用 `PlannedSubPage` 共享组件，W9-W12 真做
- ✅ **`/api/health`** + **`/api/models`**：站点状态 + 模型注册表

**P2 · 体验升级**
- ✅ **JSON-UI 真 bar/line chart 渲染器**（不再 `📊 placeholder`）
- ✅ **2.1.3 mixed 真量化评估**：4 指标条（nodes / bytes / expr / safety）+ 8 点 pros/cons
- ✅ **LabSidebar active 子页 + 折叠/展开动效**：URL 自动展开当前 lab，planned 子页 disabled
- ✅ **首页最近会话改真数据**：localStorage 持久化 + 跨页 `sessionsLog:updated` 事件联动
- ✅ **5 个 lab 页 + `useLogSession` hook**：完成后写 sessionsLog（首页实时更新）
- ✅ **`useLabActions` hook**：⌘K 的 run / stop / reset 真正派发到当前 lab

### 当前真功能（已 verify）

| Lab | 子页 | 真功能 | 数据源 |
|---|---|---|---|
| 1.1.1 Markdown | mock / api 双 source + 4 preset + 自定义 prompt + 停止/清空 + meta 解析 | DeepSeek 真 SSE（899ms first token，26 chunks） | `/api/chat` |
| 1.1.2 AG-UI | typed event 流分类 + 时间轴 + 渲染管道（TextChunk / ToolCall） | 关键词触发不同 tool call | `/api/ag-ui` |
| 1.1.3 A2UI | surface inspector（raw / tree / RenderableEvent） | 关键词触发不同 surface | `/api/a2ui` |
| 1.1.4 Compare | 协议对照（事件粒度 / 工具调用 / 状态 / 渲染） | 3 协议选 chip 切换 | 内联 mock |
| 2.1.1 TSX | iframe sandbox 隔离运行 + 编辑器 | 新 Function eval（评估后切 @babel/standalone） | 内联 mock |
| 2.1.2 JSON-UI DSL | useReducer binding + `{}` 表达式求值 + dataModelUpdate 模拟 + 真 bar/line chart | SSE patch 流 + 本地 binding 切换 | `/api/json-ui` |
| 2.1.3 Mixed | 双栏 side-by-side + 量化 trade-offs | 双管道并行 | 双 mock |

### 验证

```
npm run verify
  ✓ biome check .         (113 files, no fixes)
  ✓ tsc --noEmit          (0 errors)
  ✓ vitest run            (10 files / 68 tests)
  ✓ next build            (25 routes: 17 static + 8 dynamic)
```

- 8 个新子页（3.1.x + 4.1.x）全部 `○ Static`
- 8 个 API 端点全部 live（`/api/{chat,ag-ui,a2ui,json-ui,eval,replay,keys,health,models}`）

### 已知尾巴（不在 P0/P1/P2，留给 W5+）

1. `@babel/standalone` 真编译 TSX（要装 ~3MB 依赖）
2. Lab 3 / Lab 4 的 8 个子页**真功能**（现在是骨架 + 真实数据预览）
3. 主题切换 persistence 用 `useUiStore` 已经做，但 hot reload 时偶发 flicker（CSS 变量在 SSR 不一致）
4. W4-7：lab-topbar.tsx 已删除并入 SiteHeader，但 `views/sync-search-params.tsx` 仍是单文件未拆
5. ⌘K 的 actions 派发 `CustomEvent`，但**当前 lab 没注册 action 时是无操作**（不是 bug，但是 UI 上没提示）
6. sessionsLog 是 localStorage，**W9 升级到 IndexedDB**（PROPOSAL §10 原始计划）

---

## 10.6 W5 协议深化 + Lab 3/4 真功能（2026-06-21 · v0.1.0-w5）

> 本节在 §10.5 基础上推进 W5 协议层深化，并把 Lab 3/4 共 8 个子页从骨架升级为真功能。

### W5 协议层

**RenderableEvent 生命周期元数据**（`core/protocols/common/lifecycle.ts`）

- `EventMeta = { seq, ts, sessionId, source: 'mock'|'api', runId }`
- `EnrichedRenderableEvent = RenderableEvent & { _meta: EventMeta }`
- `createRunMeta({ source, model, prompt })` —— djb2 hash 生成 sessionId + runId
- `makeEnricher(run)` —— closure 累加 seq；`enrichAll(run, events)` 一键包装
- 12 个单测（lifecycle.test.ts）覆盖 hash 稳定性 / seq 闭包 / 跨 enricher 隔离

**AG-UI stateful adapter**（`core/protocols/ag-ui/mapper.ts`）

- 合并 TOOL_CALL_START / ARGS / END → 单个完整 tool chunk（name + args + result）
- STATE_SNAPSHOT 覆盖 buffer，STATE_DELTA 累积 path → value
- `StatefulAdapterSink` 接口：`onTool / onState / onMeta` 三个回调
- `createAguiStatefulAdapter(sink?)` —— 双签名
- 10 个单测覆盖 lifecycle 合并 / 错误传播 / sink 回调

**A2UI stateful adapter**（`core/protocols/a2ui/mapper.ts`）

- 多 surface 树 + 增量 mount/patch + dataModel 浅 merge + 嵌套 path
- `snapshot()` 返回 `Map<surfaceId, A2uiSurfaceState>`（深拷贝）
- 13 个单测覆盖多 surface 隔离 / dismiss unmount / 嵌套 path

**JSON-UI apply 核心**（`core/engine/json-ui/apply.ts`）

- `applyJsonUiPatch(doc, patch)` 前后端共用
- 修 3 个真 bug：
  - mount 单层 children path 解析错（i 步进 2 假设多嵌套）
  - patchNode mutate 原 doc 而非 clone（违反不可变）
  - 终点判定错（应为 `i + 2 === segments.length`，不是 `i === segments.length - 1`）
- 17 个单测（json-ui-apply.test.ts）

### Lab 3 Workbench 真功能（4/4）

| 子页 | 真功能 | 关键设计 |
|---|---|---|
| 3.1.1 Three-pane | 3 栏 CSS Grid + scenario chips + 模拟 SSE 流 + 实时 JsonUiRenderer | 0 新依赖；applyJsonUiPatch 实时同步 |
| 3.1.2 Inspector | 3 树切换 + onHover 节点高亮 DSL 源码 + 钉住 + 节点 props 详情 | PathWrap 注入 data-jsonui-path + PathCtx |
| 3.1.3 Heatmap | 3 kind（ERROR/WARN/INFO）+ severity 0-1 + 模拟事件流 | 复用 renderer data-jsonui-path |
| 3.1.4 Replay | 12 mock patches + scrubber + 6 按钮 + 速度 0.5x-4x + 导出导入 JSON dump | Blob URL + FileReader |

### Lab 4 Observability 真功能（4/4）

| 子页 | 真功能 | 关键设计 |
|---|---|---|
| 4.1.1 Tokens | 4 KPI + 2 SVG 图表 + 模型成本表 + 速度 0.5x-2x | 6 颜色 provider 调色板；cost = prompt/1M × costIn + completion/1M × costOut |
| 4.1.2 Tools | 3 栏（waterfall + raw events + inspector）+ createAguiStatefulAdapter 真接 | ToolStatus 3 态；MOCK_EVENTS 3 calls / 10 raw events |
| 4.1.3 Reasoning | 3 patterns（CoT / ReAct / Plan）+ SVG DAG 自动布局 + scrubber + 导出 .md | 手写最长路径 BFS 算 layer + Y 偏移（不引 react-flow） |
| 4.1.4 Score | prompt select + 13 model 切换 + 4 维启发式评分 + SVG 雷达图 + 横向对比表 | djb2 hash 派生 deterministic mock；4 维 0-10 评分 |

### Model registry 升级

- `ModelInfo` 加 `costPerMillionInput` / `costPerMillionOutput` 字段
- 13 个 BUILTIN_MODELS 加 2026 实际 USD 价格（gpt-4o-mini \$0.15/\$0.60, claude-sonnet-4-5 \$3/\$15 等）
- Ollama 本地 = \$0（无 API 成本）

### JsonUiRenderer 升级

- 注入 `data-jsonui-path` attribute on every node（`PathWrap` 包装）
- 暴露 `PathCtx` Context（`onHover` / `onSelect` / `highlightPath`）
- a11y `role="treeitem"` for table / chart

### 验证

```
npm run verify
  ✓ biome check .         (120 files)
  ✓ tsc --noEmit          (0 errors)
  ✓ vitest run            (14 files / 120 tests)  ← 68 → 120
  ✓ next build            (30 routes)
```

### 已知尾巴（留给 W6+）

1. JSON-UI chart 节点真渲染后 mock 数据 applyPatch 数组 path 仍偶发不出图（mount 行为需重测）
2. A2UI 多 surface 状态切换的 UI 还差一个"切 surface 标签"控件
3. Lab 3 / Lab 4 8 个子页的导出功能（heat md / score csv / trace json）只 tokens/reasoning/score 做了
4. sessionsLog 升级到 IndexedDB（仍 localStorage，W9 计划）
5. W5 ToolChunk.error 字段加在 v0.1.0-w5，旧版 server 不发这个字段时单元测试需 mock

---


## 7. 你可以选的下一步

| 选项 | 说明 | 预估 |
| --- | --- | --- |
| A. 先把脚手架跑起来 | 初始化 Next.js + shadcn/ui + Tailwind + Lab 骨架，4 个 Lab 路由占位 | 1 小时 |
| B. 先做 Core 层 | 落地 `core/protocols/common` + `core/models` + 通用聊天 SSE | 半天 |
| C. 先做一个端到端垂直切片 | Lab 2.1.2（JSON-UI DSL）从头到尾跑通 | 1–2 天 |
| D. 直接开 Lab 3 Workbench | 先把"三栏"做出来，反向推动 Lab 1/2 协议设计 | 1 天 |

你定个方向，我就按选定路径开干。

---

## 8. 依赖版本基线（npm `latest` 校对）

> 校对时间：2026-06-09。所有版本均为 npm `latest` tag 的当前值。
> 装包时统一用 `npm install <pkg>@latest`，避免锁住旧版本。

| 包 | 版本 | 备注 |
| --- | --- | --- |
| next | **16.2.7** | Next.js 16 GA，已用 Turbopack 默认 build |
| react | **19.2.4** | Next.js 16 硬约束（npm latest 是19.2.7，但 Next16 类型定义要求19.2.4） |
| react-dom | **19.2.4** | 同上 |
| typescript | **5.9.3** | Next.js 16 实际配套；TS 6.0.3 与 Next16 类型不兼容，**W1 暂不升** |
| @types/node | **22.13.0** | Vitest 4 + Vite 8 要求 ≥22.12 |
| @types/react | **19.2.17** | |
| @types/react-dom | **19.2.3** | |
| tailwindcss | **4.3.0** | Tailwind v4（CSS-first config） |
| @tailwindcss/postcss | **4.3.0** | Tailwind v4 PostCSS plugin |
| @tailwindcss/typography | **0.5.20** | Markdown 渲染用 |
| @biomejs/biome | **2.4.16** | 单仓统一 lint + format（替代 ESLint） |
| zustand | **5.0.14** | 仅承担"跨组件 + 高频 + 不走 URL"的客户端态（见 §9） |
| zod | **4.4.3** | 设置 / Prompt Lab 表单 schema |
| idb-keyval | **6.2.5** | session 持久化 |
| clsx | **2.1.1** | |
| tailwind-merge | **3.6.0** | |
| class-variance-authority | **0.7.1** | shadcn/ui Button variants |
| lucide-react | **1.17.0** | 图标 |
| @radix-ui/react-slot | **1.2.5** | shadcn/ui Button asChild |
| @radix-ui/react-dialog | **1.1.16** | 命令面板/弹窗（预留） |
| @radix-ui/react-tabs | **1.1.14** | |
| vitest | **4.1.8** | 单元测试 |
| @vitejs/plugin-react | **6.0.2** | Vitest React 插件 |
| jsdom | **29.1.1** | Vitest DOM 环境 |
| @testing-library/react | **16.3.2** | |
| @testing-library/dom | **10.4.0** | |
| @testing-library/jest-dom | **6.6.3** | |

**未装的依赖（按 W 节奏后续补）**：

- `react-markdown@10.1.0` + `remark-gfm@4.0.1` + `rehype-raw@7.0.0` + `rehype-sanitize@6.0.0` → **W3**
- `shiki@4.2.0` → **W3**（代码高亮）
- `@xyflow/react@12.11.0` → **W11**（Lab 4 推理 DAG）
- `recharts@3.8.1` → **W11**（token 折线图）
- `jsondiffpatch@0.7.6` → **W10**（协议解码器 diff）
- `react-resizable-panels@4.11.2` → **W9**（Lab 3 三栏）
- `react-hook-form@7.78.0` → **W3**（Prompt Lab）
- `@axe-core/react@4.11.3` → **W11**（a11y 评分）
- `@playwright/test@1.60.0` → **W11**（e2e）
- `expr-eval@2.0.2` → **W6**（DSL 数据绑定）
- `@babel/standalone@7.29.7` → **W7**（TSX 沙箱）

**升级注意（重要）**：

- **Next.js 16 breaking change**：`params` / `searchParams` / `cookies()` / `headers()` **全部 async**（必须 `await`），不再是同步访问。新代码必须用 `await props.params`。
- **React 19.2 配套**：Next.js 16 锁死 React 19.2.4，不要强行升到19.2.7（类型会断）。
- **TypeScript 6 暂不升**：Next.js 16 自带的 `eslint-config-next` 类型基于 TS5.x；强行升 TS6 会冒出类型错误。等 Next.js17 再统一升。
- **Zod 4 API 已稳定**：从 v3 升级 v4 时注意 `z.string().nonempty()` → `z.string().min(1)` 等 API 改名。
- **Vitest 4 配置**：默认走 `defineConfig` + 自带 Vite 8，无需 `vitest.config.ts` 暴露给 tsc（已从 tsconfig exclude）。
- **lucide-react 0 → 1**：图标命名空间有调整，使用前先看 changelog。

**校对脚本**（CI 里跑）：

```bash
#!/usr/bin/env bash
# scripts/check-deps.sh —— 校对 npm 最新版本
set -euo pipefail
pkgs=(
  next react react-dom typescript tailwindcss zustand zod
  react-markdown shiki @biomejs/biome vitest @xyflow/react
  recharts react-resizable-panels @tanstack/react-query
)
for p in "${pkgs[@]}"; do
  npm view "$p" version
done
```

输出若与本文档第 8 节不一致，要么更新文档、要么锁版本——不要默默装旧版。

**已知 W1 妥协（待跟踪）**：

1. TypeScript 6.0.3 在文档 §8 标注但**实际未升**（Next16 类型约束）。下次 Next.js 17 GA 时统一升。
2. ESLint 仍装在 `node_modules`（因为 `eslint-config-next` 装过），但 `package.json` 已移除依赖、`biome.json` 是唯一定义。等下次 `npm prune` 自动清理。
3. shadcn/ui 没走 `npx shadcn@latest init` 流程（因为目录非空 + 避免交互），改为手写 `components.json` + 4 个基础组件。后续用 `npx shadcn@latest add <component>` 加新组件。