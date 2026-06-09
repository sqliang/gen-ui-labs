import { LabOverview } from "@/views/lab-overview";

const FEATURES = [
  {
    label: "4.1.1 推理流可视化",
    desc: "思维链 / ReAct / Plan-and-Execute 三种模式切换展示（DAG 渲染）",
    badge: "W11",
  },
  {
    label: "4.1.2 Token 消耗仪表",
    desc: "按模型/工具/阶段拆分的 token 成本、延迟、首 token 延迟",
    badge: "W11",
  },
  {
    label: "4.1.3 工具调用回放",
    desc: "每次工具调用展示参数、结果、耗时、是否 retry",
    badge: "W11",
  },
  {
    label: "4.1.4 UI 评分",
    desc: "人工评分（likert 1–5）+ 自动指标（a11y、对比度、组件多样性）",
    badge: "W11",
  },
  {
    label: "4.1.5 失败模式库",
    desc: "收集典型失败：组件超界、循环依赖、XSS、不可达交互…",
    badge: "W12",
  },
  { label: "4.1.6 Prompt Lab", desc: "同一任务多 prompt 对比，沉淀好 prompt 模板", badge: "W12" },
];

export default function ObservabilityLabOverview() {
  return (
    <LabOverview
      labId="observability"
      title="Lab 4 · Agent Observability"
      tagline="把 AI 生成 UI 的过程打开来看。"
      features={FEATURES}
    />
  );
}
