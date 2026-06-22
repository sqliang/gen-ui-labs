import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "错误热力图",
  description:
    "ERROR / WARN / INFO 三种 heat kind 叠加在节点上，severity 决定 alpha，800ms 模拟事件流。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
