import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "节点 Inspector",
  description:
    "reverse lookup 节点：hover/click JSON-UI tree 节点 → Inspector 显示 path/type/children/props。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
