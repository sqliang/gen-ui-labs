import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI 评分卡",
  description:
    "多模型 + 多 prompt 组合评分（aesthetic / a11y / structure / stability 启发式）+ SVG 雷达图 + 导出 .csv。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
