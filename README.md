# GenUI Labs

> **一个面向 GenUI 的实验性工作台**。4 个 Lab 并列：UI 协议流式、代码/DSL 生成、引擎调试、Agent 可观测。共享 1 个 Core、1 个 RenderableEvent 中间表示、1 个 streaming-store。

![status](https://img.shields.io/badge/status-w5-blueviolet)
![tests](https://img.shields.io/badge/tests-120%20passing-brightgreen)
![stack](https://img.shields.io/badge/stack-Next.js%2016%20%C2%B7%20React%2019%20%C2%B7%20TS%205.9-blue)

## 🧪 4 Labs

| # | Lab | 子页 | 节奏 | 入口 |
|---|---|---|---|---|
| 01 | **Streaming UI Protocols** | 4 子页（1.1.1 MD · 1.1.2 AG-UI · 1.1.3 A2UI · 1.1.4 compare） | W3-W5 | [/labs/streaming](http://localhost:3000/labs/streaming) |
| 02 | **Generate UI Code & DSL** | 3 子页（2.1.1 TSX · 2.1.2 JSON-UI · 2.1.3 mixed） | W6-W8 | [/labs/codegen](http://localhost:3000/labs/codegen) |
| 03 | **Engine Debug Workbench** | 4 子页（3.1.1 三栏 · 3.1.2 Inspector · 3.1.3 热力图 · 3.1.4 Replay） | W9-W11 | [/labs/workbench](http://localhost:3000/labs/workbench) |
| 04 | **Agent Observability** | 4 子页（4.1.1 Token · 4.1.2 工具 · 4.1.3 推理 · 4.1.4 评分） | W11-W12 | [/labs/observability](http://localhost:3000/labs/observability) |

## ⚡ 30 秒上手

```bash
pnpm install
cp .env.example .env.local       # 填 DEEPSEEK_API_KEY
pnpm dev                          # localhost:3000
```

> `DEEPSEEK_API_KEY` 是唯一 **必填** 的 key（其它 provider 也能加，但只有 deepseek 走真流式）。

## 🧠 真接 LLM 端点（W6+）

所有 4 个核心协议端点都已真接 deepseek（无 key 时自动 fallback mock）：

| 端点 | protocol | 真接 deepseek | URL flag 触发 |
|---|---|---|---|
| `/api/chat` | openai-compatible | ✓ markdown 模式 | — |
| `/api/json-ui` | JSON-UI DSL | ✓ output patches | `?provider=deepseek&prompt=xxx` |
| `/api/ag-ui` | AG-UI v0.2 | ✓ typed events | `?provider=deepseek&prompt=xxx` |
| `/api/a2ui` | A2UI v0.2 | ✓ components | `?provider=deepseek&prompt=xxx` |

5 个 UI 页面已暴露 deepseek 切换：

| Page | 触发方式 |
|---|---|
| `/labs/streaming/markdown` | api/mock mode 切换 |
| `/labs/streaming/ag-ui` | URL `?provider=deepseek` |
| `/labs/streaming/a2ui` | URL `?provider=deepseek` |
| `/labs/codegen/json-ui` | toolbar mock/deepseek toggle |
| `/labs/workbench/three-pane` | scenario chip 选 deepseek |

E2E 自动化：`pnpm tsx tests/manual/e2e-chat.ts`（25 assertions across 9 sections）。

## ⌘K 全局快捷键

- **⌘K / Ctrl+K** → 命令面板（跳 Lab / 跳子页 / 跳 404 demo / github）
- 顶栏有 `search ⌘K` 按钮，hover 显示提示

## 🧬 架构原则

1. **协议先行** — UI 描述先抽象成事件流，渲染是事件流的投影
2. **Lab 隔离** — 每个 Lab 自包含可独立运行，共享 Core 但不互相耦合
3. **DSL 渐进** — 从 JSON-UI 起，先能用，再好用
4. **沙箱永远在线** — 任何 LLM 生成的 UI 代码默认在 iframe 隔离环境跑
5. **状态分层** — Zustand 只补"跨组件 + 高频 + 不入 URL"的一块短板（详见 `/about`）

## 📁 项目结构

```text
src/
├── app/                      # App Router 路由
│   ├── api/                  # SSE / REST endpoints
│   │   ├── ag-ui/            # AG-UI mock SSE
│   │   ├── a2ui/             # A2UI mock SSE
│   │   ├── json-ui/          # JSON-UI patch SSE
│   │   ├── chat/             # Markdown SSE + scenarios
│   │   ├── keys/             # /api/keys — provider 状态
│   │   ├── models/           # /api/models
│   │   └── health/           # /api/health
│   ├── labs/                 # 4 个 Lab 路由
│   │   ├── streaming/        # Lab 1
│   │   ├── codegen/          # Lab 2
│   │   ├── workbench/        # Lab 3
│   │   └── observability/    # Lab 4
│   ├── settings/             # 站点设置
│   ├── about/                # /about
│   ├── not-found.tsx         # 404
│   ├── error.tsx             # 错误 boundary
│   └── layout.tsx            # root layout
├── components/               # 共享 UI
│   ├── site-header.tsx       # 顶栏（logo + 4 nav + model + theme + ⌘K + about + src）
│   ├── site-footer.tsx       # footer
│   ├── lab-sidebar.tsx       # Lab 导航
│   ├── lab-hub.tsx           # Lab hub 通用壳
│   ├── lab-content-page.tsx  # 子页通用壳
│   ├── command-palette.tsx   # ⌘K 全局
│   ├── settings-nav.tsx
│   ├── home/                 # 首页 mini-demo
│   ├── planned-sub-page.tsx  # W9-W12 子页骨架
│   └── ui/                   # shadcn 组件
├── core/
│   ├── labs.ts               # 4 Lab 元数据（single source of truth）
│   ├── models/registry.ts    # 13 models × 6 providers
│   ├── protocols/            # 协议层
│   │   ├── ag-ui/mapper.ts   # AG-UI → RenderableEvent
│   │   ├── a2ui/mapper.ts    # A2UI → RenderableEvent
│   │   ├── common/types.ts   # RenderableEvent
│   │   └── README.md
│   ├── engine/               # 渲染引擎
│   │   ├── json-ui/          # JSON-UI 引擎（renderer / expr / types）
│   │   └── sandbox/          # iframe 沙箱（W7）
│   ├── state/                # 5 个 Zustand store
│   │   ├── ui-store.ts
│   │   ├── session-store.ts
│   │   ├── streaming-store.ts
│   │   ├── workbench-store.ts
│   │   └── observability-store.ts
│   └── render/
│       └── markdown-renderer.tsx
├── views/
│   ├── lab-sidebar.tsx       # 老 lab-sidebar 副本（re-export，保留以便平滑迁移）
│   └── sync-search-params.tsx
├── infra/
│   └── http/sse-client.ts    # SSE 客户端（fetchSse async iterator）
└── lib/
    └── utils.ts              # cn / className
tests/                        # 68 vitest
```

## 🛠️ 常用命令

```bash
pnpm dev         # next dev
pnpm verify      # biome + tsc + vitest + next build
pnpm lint        # biome check
pnpm lint:fix    # auto-fix
pnpm test        # vitest
pnpm check-deps  # 重新审计依赖 baseline
```

## 🔌 Provider 配置

详见 `/settings/models`（站点内）或 `.env.example`（仓库根）。

| Provider | 默认 models | 配 .env 变量 |
|---|---|---|
| DeepSeek | 2 | `DEEPSEEK_API_KEY` |
| OpenAI | 3 | `OPENAI_API_KEY` |
| Anthropic | 2 | `ANTHROPIC_API_KEY` |
| Google | 2 | `GOOGLE_API_KEY` |
| Qwen | 2 | `QWEN_API_KEY` |
| Ollama | 2 | （不需要 key，可选 `OLLAMA_HOST`） |

## 📚 文档

- [PROPOSAL.md](./PROPOSAL.md) — 完整方案（12 周路线图 + 设计原则 + 状态管理）
- [CHANGELOG.md](./CHANGELOG.md) — 周节奏
- [/.env.example](./.env.example) — 环境变量模板

## 🐛 Debug

- `?scenario=long|tools|error|reconnect` 加载 Lab 1.1.1 markdown 的不同 mock 场景
- `/api/health` 站点状态
- `/api/keys` provider 配置状态
- `/this-does-not-exist` 看 404 demo
