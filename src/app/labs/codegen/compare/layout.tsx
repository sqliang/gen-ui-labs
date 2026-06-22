import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Codegen 全景对照",
  description: "TSX 沙箱、JSON-UI DSL、Mixed 混合模式三选一。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
