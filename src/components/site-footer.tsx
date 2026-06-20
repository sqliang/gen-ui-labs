import Link from "next/link";

import { LABS } from "@/core/labs";

/**
 * 全站底部 footer。
 *
 * 4 列：
 * - Brand + tagline + status
 * - Labs 快速入口
 * - Resources（docs / roadmap / changelog / about）
 * - Tech stack
 *
 * 不强求华丽，但一个真站点必须有 footer —— 没 footer 的站点就是 demo。
 */
export function SiteFooter() {
  return (
    <footer className="border-foreground/5 bg-card/30 border-t backdrop-blur-sm">
      <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 font-mono text-[13px] font-medium">
              <span className="text-foreground/90">genui</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">labs</span>
            </div>
            <p className="text-muted-foreground/85 mt-3 max-w-xs text-[12px] leading-relaxed">
              协议驱动的生成式 UI 实验室。4 个 Lab 并列，1 个共享内核。
            </p>
            <div className="text-muted-foreground/60 mt-3 flex items-center gap-1.5 font-mono text-[10px]">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              all labs · online
            </div>
          </div>

          {/* Labs */}
          <div>
            <h3 className="text-muted-foreground/60 mb-3 font-mono text-[10px] tracking-widest uppercase">
              labs
            </h3>
            <ul className="space-y-1.5">
              {LABS.map((lab) => (
                <li key={lab.id}>
                  <Link
                    href={lab.href}
                    className="text-foreground/85 hover:text-foreground font-mono text-[12px] transition-colors"
                  >
                    {lab.number} · {lab.shortTitle.toLowerCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-muted-foreground/60 mb-3 font-mono text-[10px] tracking-widest uppercase">
              resources
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/about"
                  className="text-foreground/85 hover:text-foreground font-mono text-[12px] transition-colors"
                >
                  /about
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/sqliang/gen-ui-labs/blob/main/PROPOSAL.md"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-foreground/85 hover:text-foreground font-mono text-[12px] transition-colors"
                >
                  PROPOSAL.md
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sqliang/gen-ui-labs/blob/main/README.md"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-foreground/85 hover:text-foreground font-mono text-[12px] transition-colors"
                >
                  README
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sqliang/gen-ui-labs/blob/main/CHANGELOG.md"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-foreground/85 hover:text-foreground font-mono text-[12px] transition-colors"
                >
                  CHANGELOG
                </a>
              </li>
            </ul>
          </div>

          {/* Tech */}
          <div>
            <h3 className="text-muted-foreground/60 mb-3 font-mono text-[10px] tracking-widest uppercase">
              stack
            </h3>
            <ul className="space-y-1.5 font-mono text-[12px]">
              <li className="text-foreground/85">next.js 16 · react 19</li>
              <li className="text-foreground/85">tailwind 4 · shadcn/ui</li>
              <li className="text-foreground/85">zustand 5 · zod 4</li>
              <li className="text-foreground/85">typescript 5.9</li>
            </ul>
          </div>
        </div>

        {/* bottom bar */}
        <div className="border-foreground/5 mt-10 flex flex-col items-start justify-between gap-3 border-t pt-6 sm:flex-row sm:items-center">
          <p className="text-muted-foreground/60 font-mono text-[10.5px]">
            © 2026 sqliang · MIT license · v0.1.0-w4
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/sqliang/gen-ui-labs"
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground/70 hover:text-foreground font-mono text-[11px] transition-colors"
            >
              github ↗
            </a>
            <span className="text-muted-foreground/30">·</span>
            <a
              href="https://github.com/sqliang/gen-ui-labs/issues"
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground/70 hover:text-foreground font-mono text-[11px] transition-colors"
            >
              report issue
            </a>
            <span className="text-muted-foreground/30">·</span>
            <a
              href="https://github.com/sqliang/gen-ui-labs/releases"
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground/70 hover:text-foreground font-mono text-[11px] transition-colors"
            >
              releases
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
