import { LabOverview } from "@/views/lab-overview";

const FEATURES = [
  {
    label: "2.1.1 React/TSX 代码生成",
    desc: "LLM 输出 TSX 字符串，运行时沙箱编译（@babel/standalone）",
    badge: "W7",
  },
  {
    label: "2.1.2 JSON-UI DSL 生成",
    desc: "LLM 输出结构化 JSON（树形组件），前端映射到本地组件树渲染",
    badge: "W6",
  },
  {
    label: "2.1.3 混合：DSL + 自由代码",
    desc: "顶层用 DSL 描述布局/数据流，叶子节点允许内联小段 JSX",
    badge: "W7",
  },
  {
    label: "2.1.4 低代码（LCDP）引擎渲染",
    desc: "把 DSL 视作低代码页面定义，实现属性面板/数据源绑定/事件编排",
    badge: "W11",
  },
  {
    label: "2.1.5 代码 → DSL 反向",
    desc: "把生成的 TSX 解析回 DSL，方便后续用 Lab 3 调试",
    badge: "W10",
  },
  {
    label: "2.1.6 多模型对比",
    desc: "同 prompt 用 GPT-4.1 / Claude Sonnet / Qwen / DeepSeek 等生成",
    badge: "W11",
  },
];

export default function CodegenLabOverview() {
  return (
    <LabOverview
      labId="codegen"
      title="Lab 2 · Generate UI Code & DSL"
      tagline="研究 LLM 产出 UI 的两种典型形态——直接可执行代码 vs. DSL → 引擎渲染。"
      features={FEATURES}
    />
  );
}
