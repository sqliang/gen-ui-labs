import type { LucideIcon } from "lucide-react";
import { Bot, Code2, Eye, Radio } from "lucide-react";

/**
 * 四个 Lab 的元数据 —— 侧栏导航 / 首页卡片 / 文档索引都从这里读。
 *
 * 设计原则：
 * - 每个 Lab 有自己的 accent 色（oklch），用于卡片、侧栏激活态、微 demo 的强调色
 * - 每个 Lab 有 3-5 个 feature bullets，让卡片不只是"一句话描述"
 * - 每个 Lab 有自己的 miniDemo 标识，由 LabCard 渲染对应的 mini 可视化
 */
export type LabId = "streaming" | "codegen" | "workbench" | "observability";

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
  },
] as const;

export function getLab(id: LabId): LabDefinition {
  const lab = LABS.find((l) => l.id === id);
  if (!lab) throw new Error(`Unknown lab id: ${id}`);
  return lab;
}
