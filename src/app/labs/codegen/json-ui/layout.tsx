import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JSON-UI DSL 渲染",
  description:
    "JSON-UI 声明式 DSL：mount / patch / unmount patch 流 → applyJsonUiPatch → 递归渲染组件树。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
