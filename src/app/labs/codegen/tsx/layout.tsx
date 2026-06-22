import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TSX 沙箱执行",
  description: "LLM 生成 React TSX 在 iframe sandbox 内 new Function 执行，捕获 runtime 错误。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
