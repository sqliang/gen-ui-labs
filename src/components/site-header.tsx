import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { LABS } from "@/core/labs";

/**
 * 顶部栏 —— 站点 logo + 版本 + 状态点。
 * 设计：固定高度、半透明 backdrop-blur、底部细线分割。
 * 不是 sticky —— 由 layout 用 grid 控制，避免与 main 滚动冲突。
 */
export function SiteHeader() {
  return (
    <header className="bg-background/70 supports-[backdrop-filter]:bg-background/50 sticky top-0 z-40 border-b border-white/5 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-4 px-5">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-mono text-[13px] font-medium tracking-tight"
        >
          <LogoMark className="text-foreground size-5 transition-transform group-hover:rotate-12" />
          <span>
            <span className="text-foreground/90">genui</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">labs</span>
          </span>
        </Link>

        <span className="hidden items-center gap-1.5 font-mono text-[10px] text-muted-foreground sm:flex">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_oklch(0.7_0.18_150)]" />
          v0.1 · w4
        </span>

        <Separator orientation="vertical" className="hidden h-4 bg-white/10 sm:block" />

        {/* 面包屑 —— 这里只放当前页绝对路径，便于以后扩展 */}
        <nav className="hidden items-center gap-1 font-mono text-[11px] text-muted-foreground md:flex">
          {LABS.map((lab) => (
            <Link
              key={lab.id}
              href={lab.href}
              className="hover:text-foreground/80 transition-colors"
            >
              ~/{lab.id}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-[10px] text-muted-foreground lg:inline">
            next.js 16 · react 19 · zustand 5
          </span>
          <a
            href="https://github.com/sqliang/gen-ui-labs"
            target="_blank"
            rel="noreferrer noopener"
            className="border-border/40 hover:border-border hover:bg-secondary/40 rounded-md border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            src ↗
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * 小 logo：4 个叠加的小方块，模拟"协议 chunk 流"。
 * 用纯 SVG，颜色随主题走 currentColor，hover 时会微微旋转（在父组件 group-hover 控制）。
 */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="GenUI Labs logo"
    >
      <rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.85" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="1" />
    </svg>
  );
}
