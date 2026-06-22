import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "离线 Replay",
  description: "scrubber + 6 按钮 + speed 0.5x-4x，从 mock patch 流回放 + 导出 JSON dump。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
