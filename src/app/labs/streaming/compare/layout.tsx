import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "协议对照表",
  description: "Markdown vs AG-UI vs A2UI 三种协议的字段、状态机、依赖、易用性横向对比。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
