import type { LucideIcon } from "lucide-react";
import { Bot, Code2, Eye, Radio } from "lucide-react";

/**
 * 四个 Lab 的元数据 —— 侧栏导航 / 首页卡片 / Lab hub 子页都从这里读。
 *
 * 设计原则：
 * - 每个 Lab 有自己的 accent 色（oklch），用于卡片、侧栏激活态、微 demo 的强调色
 * - 每个 Lab 有 3-5 个 feature bullets，让卡片不只是"一句话描述"
 * - 每个 Lab 有自己的 miniDemo 标识，由 LabCard 渲染对应的 mini 可视化
 * - 每个 Lab 有 subPages 列表（hub 页用），每个子页有 status + 可选 stats
 */
export type LabId = "streaming" | "codegen" | "workbench" | "observability";

/** 子页面完成状态 */
export type SubPageStatus = "done" | "wip" | "planned";

/** 子页面元数据 —— 用于 Lab hub 的子功能卡 */
export interface LabSubPage {
  /** 子路径，prefix = lab.href，例如 "/labs/streaming/markdown" */
  href: string;
  /** 子页面编号，例 "1.1.1" */
  number: string;
  /** 中文标题 */
  title: string;
  /** 一句话说明 */
  description: string;
  /** 进度：done = 已交付；wip = 在搭；planned = 还没动 */
  status: SubPageStatus;
  /** 可选：进度数据，例如 "12 events · 1.7s" —— 不同 Lab 含义不同 */
  stats?: string;
  /** 可选：归属周次，例如 "W4"，用于 badge */
  week?: string;
  /** 可选：子页面专属协议/技术标签 */
  protocol?: string;
}

export interface LabDefinition {
  id: LabId;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** OKLCH 色相环值，用于卡片 accent / hover glow / 侧栏激活态 */
  accent: {
    hue: number;
    /** 主色（前景 / 边框 / 图标） */
    solid: string;
    /** 主色填充（背景 10-15% 不透明度） */
    soft: string;
    /** glow / 焦点环 */
    glow: string;
  };
  /** 中文小标签 */
  badge: string;
  /** status: ready = 可进入；wip = 还在搭 */
  status: "ready" | "wip";
  /** 卡片里的 feature 列表，每条短句 */
  features: string[];
  /** 卡片右上角显示的协议 / 形态标识 */
  protocolLabel: string;
  /** 用于 mini-demo 区，告诉 LabCard 渲染哪种可视化 */
  miniDemo: "streaming" | "codegen" | "workbench" | "observability";
  /** Lab hub 上的子页面列表 —— 4 个 Lab 都有，状态会不一样 */
  subPages: LabSubPage[];
}

export const LABS: LabDefinition[] = [
  {
    id: "streaming",
    number: "01",
    title: "Streaming UI Protocols",
    shortTitle: "Streaming",
    description:
      "把 LLM / Agent 的输出边生成边渲染：Markdown、AG-UI、A2UI 协议对照，支持时间轴回放。",
    href: "/labs/streaming",
    icon: Radio,
    accent: {
      hue: 230,
      solid: "oklch(0.78 0.16 230)",
      soft: "oklch(0.78 0.16 230 / 0.12)",
      glow: "oklch(0.78 0.16 230 / 0.35)",
    },
    badge: "协议",
    status: "wip",
    features: [
      "Markdown 流式增量解析",
      "AG-UI 事件 reducer",
      "A2UI v0.2 JSON-UI",
      "协议对照 · 时间轴回放",
    ],
    protocolLabel: "AG-UI · A2UI · MD",
    miniDemo: "streaming",
    subPages: [
      {
        href: "/labs/streaming/markdown",
        number: "1.1.1",
        title: "Markdown 流式渲染",
        description: "LLM 输出 Markdown，前端基于 SSE 流式增量解析渲染",
        status: "done",
        stats: "8 events · 1.7s",
        week: "W3",
        protocol: "Markdown",
      },
      {
        href: "/labs/streaming/ag-ui",
        number: "1.1.2",
        title: "AG-UI 协议流式渲染",
        description: "AG-UI 协议解析器，支持组件事件（TEXT_MESSAGE_CONTENT / TOOL_CALL_START …）",
        status: "done",
        stats: "12 events · reducer",
        week: "W4",
        protocol: "AG-UI",
      },
      {
        href: "/labs/streaming/a2ui",
        number: "1.1.3",
        title: "A2UI 协议渲染",
        description: "按 A2UI v0.2 规范解析 surfaceUpdate / dataModelUpdate，还原 JSON-UI",
        status: "wip",
        week: "W5",
        protocol: "A2UI",
      },
      {
        href: "/labs/streaming/compare",
        number: "1.1.4",
        title: "协议对照台",
        description: "同一条 prompt，分别用 AG-UI / A2UI / Markdown 三路流式渲染，肉眼对比差异",
        status: "wip",
        week: "W5",
        protocol: "Compare",
      },
    ],
  },
  {
    id: "codegen",
    number: "02",
    title: "Generate UI Code & DSL",
    shortTitle: "Codegen",
    description:
      "LLM 直接生成可执行 TSX（沙箱运行）vs 生成 JSON-UI DSL（引擎渲染）。包含 TSX ↔ DSL 反向、低代码模式。",
    href: "/labs/codegen",
    icon: Code2,
    accent: {
      hue: 290,
      solid: "oklch(0.74 0.18 290)",
      soft: "oklch(0.74 0.18 290 / 0.12)",
      glow: "oklch(0.74 0.18 290 / 0.35)",
    },
    badge: "生成",
    status: "wip",
    features: [
      "TSX 沙箱编译 + iframe 隔离",
      "JSON-UI DSL 组件字典",
      "DSL ↔ TSX 反向",
      "低代码 LCDP 模式",
    ],
    protocolLabel: "TSX · DSL · LCDP",
    miniDemo: "codegen",
    subPages: [
      {
        href: "/labs/codegen/tsx",
        number: "2.1.1",
        title: "TSX 代码生成",
        description: "LLM 生成 React 代码 → sandbox iframe 安全执行 → 实时渲染",
        status: "done",
        stats: "sandbox · postMessage",
        week: "W7",
        protocol: "TSX",
      },
      {
        href: "/labs/codegen/json-ui",
        number: "2.1.2",
        title: "JSON-UI DSL",
        description: "JSON-UI 声明式 DSL → React 递归渲染。card / table / button / chart",
        status: "done",
        stats: "renderer · /api/json-ui",
        week: "W6",
        protocol: "DSL",
      },
      {
        href: "/labs/codegen/mixed",
        number: "2.1.3",
        title: "混合（DSL + TSX）",
        description: "同一 UI 的两种表达 → 统一渲染管道 → 对照评估",
        status: "wip",
        week: "W8",
        protocol: "Mixed",
      },
    ],
  },
  {
    id: "workbench",
    number: "03",
    title: "Engine Debug Workbench",
    shortTitle: "Workbench",
    description:
      "Artifact 风格三栏调试台：左源码/DSL、中过程事件、右实时渲染。节点 Inspector + 错误热力 + 离线 Replay。",
    href: "/labs/workbench",
    icon: Eye,
    accent: {
      hue: 75,
      solid: "oklch(0.82 0.16 75)",
      soft: "oklch(0.82 0.16 75 / 0.12)",
      glow: "oklch(0.82 0.16 75 / 0.32)",
    },
    badge: "调试",
    status: "wip",
    features: [
      "三栏可拖拽 Workbench",
      "节点 Inspector 反向高亮",
      "渲染错误热力图",
      "协议事件 Diff 解码",
    ],
    protocolLabel: "Inspector · Replay",
    miniDemo: "workbench",
    subPages: [
      {
        href: "/labs/workbench",
        number: "3.1.1",
        title: "三栏 Workbench",
        description: "左源码/DSL · 中过程事件 · 右实时渲染；与 Lab 1/2 联动",
        status: "wip",
        stats: "3 panes · scrubber",
        week: "W9",
        protocol: "Workbench",
      },
      {
        href: "/labs/workbench",
        number: "3.1.2",
        title: "节点 Inspector",
        description: "选中渲染区域，反向高亮 DSL/TSX 节点 + 数据 attribute",
        status: "planned",
        week: "W10",
        protocol: "Inspector",
      },
      {
        href: "/labs/workbench",
        number: "3.1.3",
        title: "错误热力图",
        description: "把渲染异常叠加在源码上（运行时报错、布局错位）",
        status: "planned",
        week: "W10",
        protocol: "Heatmap",
      },
      {
        href: "/labs/workbench",
        number: "3.1.4",
        title: "离线 Replay",
        description: "导入一次会话的 dump（事件 + 源码 + 中间态），完全离线重放",
        status: "planned",
        week: "W11",
        protocol: "Replay",
      },
    ],
  },
  {
    id: "observability",
    number: "04",
    title: "Agent Observability",
    shortTitle: "Observability",
    description:
      "把 AI 生成 UI 的过程打开来看：思维链 / ReAct / Plan 三种模式、token 成本、工具调用回放、UI 评分。",
    href: "/labs/observability",
    icon: Bot,
    accent: {
      hue: 150,
      solid: "oklch(0.78 0.15 150)",
      soft: "oklch(0.78 0.15 150 / 0.12)",
      glow: "oklch(0.78 0.15 150 / 0.32)",
    },
    badge: "可观测",
    status: "wip",
    features: [
      "思维链 / ReAct / Plan 视图",
      "Token 成本实时面板",
      "工具调用回放",
      "UI 评分卡（多模型）",
    ],
    protocolLabel: "Tokens · Tools · Score",
    miniDemo: "observability",
    subPages: [
      {
        href: "/labs/observability",
        number: "4.1.1",
        title: "Token 成本面板",
        description: "实时按模型统计 prompt / completion / 首 token 延迟",
        status: "wip",
        stats: "tokens · firstToken",
        week: "W11",
        protocol: "Tokens",
      },
      {
        href: "/labs/observability",
        number: "4.1.2",
        title: "工具调用回放",
        description: "AG-UI 触发的工具调用全链路 + 时延可视化",
        status: "wip",
        week: "W11",
        protocol: "Tools",
      },
      {
        href: "/labs/observability",
        number: "4.1.3",
        title: "Agent 推理链",
        description: "ReAct / Plan / CoT 三种模式时间轴，可逐步回放",
        status: "wip",
        week: "W12",
        protocol: "Reasoning",
      },
      {
        href: "/labs/observability",
        number: "4.1.4",
        title: "UI 评分卡",
        description: "同 prompt 多模型生成，统一评分卡横向对比",
        status: "planned",
        week: "W12",
        protocol: "Score",
      },
    ],
  },
] as const;

export function getLab(id: LabId): LabDefinition {
  const lab = LABS.find((l) => l.id === id);
  if (!lab) throw new Error(`Unknown lab id: ${id}`);
  return lab;
}
