import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AG-UI 协议流式",
  description:
    "AG-UI v0.2 用 TEXT_MESSAGE_* + TOOL_CALL_* + STATE_DELTA → W5 stateful adapter 合并 → RenderableEvent 走统一渲染管道。",
};

// 让 page.tsx 自然渲染（不嵌套额外 layout）
export default function SubPageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
