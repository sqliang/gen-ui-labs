import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "A2UI 协议流式",
  description:
    "A2UI v0.2 多 surface 模型：beginRendering + surfaceUpdate + dataModelUpdate 增量更新 → stateful adapter 维护 surface map。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
