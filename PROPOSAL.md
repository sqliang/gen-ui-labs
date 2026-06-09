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
| 框架 | **Next.js 15（App Router）+ React 19** | RSC + Server Actions + Edge Runtime 都能用，路由清晰 |
| 语言 | **TypeScript 5.x（strict）** | 全栈类型化 |
| 样式 | **Tailwind CSS v4** + **CSS Variables** | token 化主题，暗色零成本 |
| 组件库 | **shadcn/ui**（Radix + Tailwind） | Tailwind 原生、可复制可改、无版本锁 |
| 头部 | **App Router + RSC + Server Actions** | 协议流用 RSC streaming |
| 状态 | **Zustand**（客户端）+ **React Server State** | 轻量、无样板 |
| 数据获取 | **TanStack Query**（如果需要缓存） | 视 Lab 4 仪表盘而定 |
| 协议流 | **SSE（`ReadableStream`）+ WebSocket** | SSE 默认，WS 备选 |
| Markdown | **react-markdown + remark-gfm + rehype-raw + rehype-sanitize** | 流式 + 安全 |
| 代码高亮 | **Shiki**（SSR 友好，主题多） | 暗色主题一致 |
| 表达式 | **expr-eval** 或 **@expry/expr** | DSL 数据绑定 |
| 沙箱 | **iframe + `postMessage`** + `@babel/standalone` | 跑生成的 TSX |
| 工作台布局 | **react-resizable-panels** | 三栏可拖拽 |
| 流程图 | **@xyflow/react** | 推理 DAG |
| 图表 | **recharts** | token 折线图 |
| JSON diff | **jsondiffpatch** | 协议解码器 diff |
| 表单 | **react-hook-form + zod** | 设置 / Prompt Lab |
| 测试 | **Vitest + Testing Library + Playwright** | 单元 + e2e |
| Lint/Format | **Biome**（单仓统一） | 速度优于 ESLint+Prettier 组合 |
| 监控 | 自研事件总线 + Web Vitals | 不接第三方 |

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

## 7. 你可以选的下一步

| 选项 | 说明 | 预估 |
| --- | --- | --- |
| A. 先把脚手架跑起来 | 初始化 Next.js + shadcn/ui + Tailwind + Lab 骨架，4 个 Lab 路由占位 | 1 小时 |
| B. 先做 Core 层 | 落地 `core/protocols/common` + `core/models` + 通用聊天 SSE | 半天 |
| C. 先做一个端到端垂直切片 | Lab 2.1.2（JSON-UI DSL）从头到尾跑通 | 1–2 天 |
| D. 直接开 Lab 3 Workbench | 先把"三栏"做出来，反向推动 Lab 1/2 协议设计 | 1 天 |

你定个方向，我就按选定路径开干。