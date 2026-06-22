import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent 推理链",
  description: "CoT / ReAct / Plan 三种 agent 推理模式 DAG 可视化，scrubber 逐步回放，导出 .md。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
