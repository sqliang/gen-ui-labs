import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Markdown 流式渲染",
  description:
    "mock / api / react demo / ag-ui / a2ui / json-ui 6 种 mode 切换，支持自定义 prompt。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
