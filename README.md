# GenUI Labs

> 一个面向**生成式 UI（Generative UI）** 的实验性工作台：UI 协议流式渲染、LLM 生成 UI 代码/DSL、渲染引擎调试、Agent 可观测。

详细方案见 [`PROPOSAL.md`](./PROPOSAL.md)。

## 当前状态

**W1 脚手架 ✅ 完成**（2026-06-09）。`npm run dev` / `build` / `typecheck` / `lint` / `test` 全部通过。

## 技术栈

| 层 | 选型 | 版本 |
| --- | --- | --- |
| 框架 | Next.js (App Router + Turbopack) | 16.2.7 |
| UI 库 | React | 19.2.4 |
| 语言 | TypeScript（strict + noUncheckedIndexedAccess） | 5.9.3 |
| 样式 | Tailwind CSS v4（CSS-first config）+ shadcn/ui (zinc) | 4.3.0 |
| 状态 | Zustand（仅承担"跨组件 + 高频 + 不走 URL"的客户端态） | 5.0.14 |
| Lint | Biome（替代 ESLint） | 2.4.16 |
| 测试 | Vitest + Testing Library | 4.1.8 |

详见 PROPOSAL.md §3.1 / §8 / §9 / §10。

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:3000 查看首页。

## 工程脚本

```bash
npm run dev         # Next dev server（默认 3000）
npm run build       # 生产构建（12 静态页 + 5 API 路由）
npm run typecheck   # tsc --noEmit
npm run lint        # Biome check
npm run lint:fix    # 自动修复
npm run format      # Biome format
npm run test        # Vitest 单次
npm run test:watch  # Vitest 监听
npm run check-deps  # 校对 npm latest 版本
```

## 目录结构

```
src/
├─ app/
│   ├─ (home 未实现)/  ← 占位：当前 / 是首页
│   ├─ api/                # 5 个 stub 路由（chat/ag-ui/a2ui/eval/replay）
│   ├─ labs/               # 4 个 Lab 总览 + 子页签
│   │   ├─ streaming/      # Lab 1
│   │   │   ├─ page.tsx
│   │   │   ├─ markdown/   # 1.1.1（可点击模拟流式）
│   │   │   ├─ ag-ui/      # 1.1.2（W4 占位）
│   │   │   ├─ a2ui/       # 1.1.3（W5 占位）
│   │   │   └─ compare/    # 1.1.4（W5 占位）
│   │   ├─ codegen/        # Lab 2
│   │   ├─ workbench/      # Lab 3
│   │   └─ observability/  # Lab 4
│   ├─ layout.tsx          # Root layout
│   ├─ globals.css         # CSS 变量 + Tailwind v4 @theme
│   └─ page.tsx            # 首页（Lab 入口 + 最近会话）
│
├─ components/
│   ├─ ui/                 # shadcn/ui 组件（Button / Card / Badge / Separator）
│   └─ theme-applier.tsx   # 主题应用器
│
├─ core/
│   ├─ state/              # 5 个 Zustand store（ui / session / streaming / workbench / observability）
│   ├─ protocols/          # 协议层（占位，W3 起落地）
│   ├─ engine/             # 渲染引擎（占位，W6 起落地）
│   ├─ agent/              # Agent 运行时（占位，W8 落地）
│   ├─ models/             # 多模型 provider（占位，W2 落地）
│   ├─ eval/               # 评分（占位，W11 落地）
│   ├─ components/         # 组件注册表（占位，W2 落地）
│   └─ session/            # 会话与回放（占位，W9 落地）
│
├─ features/               # 按 Lab 拆的功能模块（占位）
├─ views/                  # 页面级 UI 编排（lab-sidebar / lab-topbar / lab-overview）
├─ infra/                  # 工具/网络/存储（占位）
└─ lib/                    # 工具函数（cn / formatDate / shortId 等）
```

## 设计原则（PROPOSAL.md §6 / §9 摘要）

- **协议先行**：UI 描述先抽象成事件流，渲染是事件流的投影
- **Lab 隔离**：每个 Lab 自包含可独立运行，共享 Core 但不互相耦合
- **DSL 渐进**：先能用，再好用
- **沙箱永远在线**：LLM 生成的 UI 代码默认在 iframe 隔离环境跑
- **失败是数据**：失败模式库是核心资产
- **状态分层**：Zustand 只承担"跨组件 + 高频 + 不走 URL"的客户端态；其他归 RSC / URL / TanStack Query / react-hook-form

## 重要文档

- [PROPOSAL.md](./PROPOSAL.md) — 项目方案（含功能设计 / 模块设计 / 技术栈 / 目录结构 / 12 周节奏 / 风险 / 依赖基线 / W1 落地记录）
- [AGENTS.md](./AGENTS.md) — Next.js 16 警告（读 `node_modules/next/dist/docs/` 再写代码）
- [CLAUDE.md](./CLAUDE.md) — Claude Code 提示规则

## 路线图

详见 PROPOSAL.md §4 + §10.4。

- **W1（已完成）**：脚手架 ✅
- **W2**：多模型 provider + SSE 通道 + 真实 LLM 流
- **W3**：Markdown 协议流式 + AG-UI 协议 reducer
- **W4**：AG-UI 协议端到端
- **W5**：A2UI 协议 + 协议对照台
- **W6**：JSON-UI DSL 渲染（Lab 2 核心）
- **W7**：TSX 沙箱
- **W8**：Agent runtime（ReAct / Plan-Execute）
- **W9**：Lab 3 三栏 Workbench
- **W10**：Lab 3 Inspector / 错误热力 / Replay
- **W11**：Lab 4 推理 DAG + Token 仪表 + 评分
- **W12**：Prompt Lab + 失败模式库 + 文档收尾