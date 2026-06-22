import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "工具调用回放",
  description:
    "AG-UI TOOL_CALL_START / ARGS / END 完整 lifecycle：args 流式拼接 + 瀑布时延 + 错误高亮 + 导出 trace.json。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
