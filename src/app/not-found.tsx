import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * 全局 not-found 页 —— Next.js App Router 在任何路由 404 时渲染。
 *
 * 设计原则：
 * - 不要 Next.js 默认丑页
 * - 列出 4 个 Lab 入口帮助用户回到主线
 * - 留 404 编号让"出错感"收敛到 1 个数字，不情绪化
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl text-center">
        <p className="text-muted-foreground/60 font-mono text-[11px] tracking-widest uppercase">
          error · 404 · not found
        </p>
        <h1 className="mt-3 font-mono text-5xl font-semibold tracking-tight sm:text-6xl">404</h1>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          这个路径没被任何 Lab 认领。可能它还在 roadmap 上，也可能打错了。
        </p>

        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LABS.map((lab) => (
            <Link
              key={lab.href}
              href={lab.href}
              className="border-foreground/10 hover:border-foreground/30 hover:bg-foreground/[0.03] rounded-md border px-3 py-2 font-mono text-[11px] transition-colors"
            >
              <span
                className="block text-[10px] tracking-wider uppercase opacity-70"
                style={{ color: lab.accent.solid }}
              >
                {lab.number}
              </span>
              <span className="text-foreground/90 mt-0.5 block">{lab.shortTitle}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <Button asChild size="sm">
            <Link href="/">回到首页</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/about">关于这个站</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

const LABS = [
  {
    number: "01",
    shortTitle: "streaming",
    href: "/labs/streaming",
    accent: { solid: "oklch(0.78 0.16 230)" },
  },
  {
    number: "02",
    shortTitle: "codegen",
    href: "/labs/codegen",
    accent: { solid: "oklch(0.74 0.18 290)" },
  },
  {
    number: "03",
    shortTitle: "workbench",
    href: "/labs/workbench",
    accent: { solid: "oklch(0.82 0.16 75)" },
  },
  {
    number: "04",
    shortTitle: "observability",
    href: "/labs/observability",
    accent: { solid: "oklch(0.78 0.15 150)" },
  },
];
