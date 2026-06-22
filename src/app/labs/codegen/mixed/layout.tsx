import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TSX vs JSON-UI 量化对比",
  description:
    "8 个维度 ProsCons + 4 个量化指标：render nodes / sandbox state / type safety / a11y。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
