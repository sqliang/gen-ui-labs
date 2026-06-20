import { LabSidebar } from "@/components/lab-sidebar";

/**
 * /labs/* 路由的专用 layout —— 在 root layout 的 SiteHeader 之下加侧栏。
 *
 * 首页（/）不经过这个 layout，所以首页只有顶部栏、没有左侧导航。
 * 这是 Next.js App Router 的"嵌套 layout"用法：子 layout 不会影响兄弟路由。
 */
export default function LabsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1">
      <LabSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
