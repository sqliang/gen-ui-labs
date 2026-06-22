import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Token 成本面板",
  description:
    "13 模型 6 provider 的 prompt/completion token 累加 + USD 成本计算 + TTFT sparkline + 累积成本曲线。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
