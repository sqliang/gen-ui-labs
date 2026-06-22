import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "三栏 Workbench",
  description:
    "Source / Events / Render 三栏调试台：default / chart / form 3 个 scenario，13 个真实 mock patch。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
