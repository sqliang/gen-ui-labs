import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import type { LabDefinition, LabSubPage, SubPageStatus } from "@/core/labs";

/**
 * Lab hub 页面通用组件。
 *
 * 设计：
 * - 复用首页 LabCard 的设计语言（accent 色 + status 标识 + 进度 stats）
 * - LabHero：左侧 Lab 编号 + icon + 标题 + 描述 + features；右侧进度面板
 * - SubPageGrid：2 列网格，每个子页是一个 SubPageCard（用 accent 色 + status badge）
 * - SubPageCard：与首页 LabCard 共用 hover glow / mini window chrome
 *
 * 这是 4 个 Lab hub 的统一外壳。新增 Lab 或新增子页面时，只需要：
 * 1. 在 core/labs.ts 加 subPages
 * 2. 在 page.tsx 调 <LabHub lab={getLab("...")} />
 */

export function LabHub({ lab }: { lab: LabDefinition }) {
  const Icon = lab.icon;
  const doneCount = lab.subPages.filter((p) => p.status === "done").length;
  const wipCount = lab.subPages.filter((p) => p.status === "wip").length;
  const plannedCount = lab.subPages.filter((p) => p.status === "planned").length;
  const totalCount = lab.subPages.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-6 pt-8 pb-16"
      style={
        {
          "--lab-accent": lab.accent.solid,
          "--lab-accent-soft": lab.accent.soft,
          "--lab-accent-glow": lab.accent.glow,
        } as React.CSSProperties
      }
    >
      <LabHero
        lab={lab}
        Icon={Icon}
        progress={{
          done: doneCount,
          wip: wipCount,
          planned: plannedCount,
          total: totalCount,
          pct: progressPct,
        }}
      />

      <SubPageGrid subPages={lab.subPages} accent={lab.accent} badgeLabel={lab.badge} />
    </div>
  );
}

/* ─────────────────── LabHero ─────────────────── */

function LabHero({
  lab,
  Icon,
  progress,
}: {
  lab: LabDefinition;
  Icon: typeof lab.icon;
  progress: { done: number; wip: number; planned: number; total: number; pct: number };
}) {
  return (
    <header className="mb-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        {/* 左侧：标题 + 描述 + features */}
        <div>
          <div className="mb-3 flex items-center gap-2 font-mono text-[11px]">
            <span
              className="rounded-md px-2 py-1"
              style={{
                backgroundColor: lab.accent.soft,
                color: lab.accent.solid,
                boxShadow: `inset 0 0 0 1px ${lab.accent.solid}33`,
              }}
            >
              lab {lab.number}
            </span>
            <span className="text-muted-foreground/70">{lab.protocolLabel}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground/70">{lab.badge}</span>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex size-11 items-center justify-center rounded-lg"
              style={{
                backgroundColor: lab.accent.soft,
                color: lab.accent.solid,
                boxShadow: `inset 0 0 0 1px ${lab.accent.solid}33`,
              }}
            >
              <Icon className="size-5" />
            </div>
            <h1 className="text-foreground text-[32px] font-semibold tracking-tight sm:text-[40px]">
              {lab.title}
            </h1>
          </div>

          <p className="text-muted-foreground/90 max-w-2xl text-[15px] leading-relaxed">
            {lab.description}
          </p>

          {/* features */}
          <ul className="text-foreground/85 mt-5 grid gap-1.5 text-[13px] sm:grid-cols-2">
            {lab.features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: lab.accent.solid }}
                />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* 右侧：进度面板 */}
        <div className="border-foreground/10 bg-card/40 rounded-xl border p-4 backdrop-blur-sm lg:min-w-[280px]">
          <div className="text-muted-foreground/60 mb-2 font-mono text-[10px] tracking-widest uppercase">
            progress
          </div>
          <div className="mb-3 flex items-baseline gap-1">
            <span
              className="font-mono text-3xl font-semibold tabular-nums"
              style={{ color: lab.accent.solid }}
            >
              {progress.pct}
            </span>
            <span className="text-muted-foreground font-mono text-sm">%</span>
            <span className="text-muted-foreground/70 ml-2 font-mono text-[11px]">
              {progress.done}/{progress.total} done
            </span>
          </div>
          {/* 进度条 */}
          <div className="bg-foreground/10 mb-3 h-1.5 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress.pct}%`,
                background: `linear-gradient(90deg, ${lab.accent.solid}, ${lab.accent.glow})`,
              }}
            />
          </div>
          {/* 状态分解 */}
          <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
            <StatusDot color="oklch(0.7 0.18 150)" label="done" count={progress.done} />
            <StatusDot color="oklch(0.82 0.16 75)" label="wip" count={progress.wip} />
            <StatusDot color="oklch(0.6 0.02 280)" label="planned" count={progress.planned} />
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusDot({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground/70">{label}</span>
      <span className="text-foreground/80 ml-auto font-mono tabular-nums">{count}</span>
    </div>
  );
}

/* ─────────────────── SubPageGrid + SubPageCard ─────────────────── */

function SubPageGrid({
  subPages,
  accent,
  badgeLabel,
}: {
  subPages: LabSubPage[];
  accent: LabDefinition["accent"];
  badgeLabel: string;
}) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div
            className="mb-1 font-mono text-[11px] tracking-widest uppercase"
            style={{ color: accent.solid }}
          >
            sub-pages
          </div>
          <h2 className="text-foreground/95 text-2xl font-semibold tracking-tight">子功能</h2>
        </div>
        <div className="text-muted-foreground/70 hidden font-mono text-[12px] sm:block">
          {subPages.length} items
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {subPages.map((p) => (
          <SubPageCard
            key={`${p.number}-${p.title}`}
            page={p}
            accent={accent}
            badgeLabel={badgeLabel}
          />
        ))}
      </div>
    </section>
  );
}

function SubPageCard({
  page,
  accent,
  badgeLabel,
}: {
  page: LabSubPage;
  accent: LabDefinition["accent"];
  badgeLabel: string;
}) {
  const isDisabled = page.status === "planned";
  const inner = (
    <div
      className={`group/sub relative flex h-full flex-col overflow-hidden rounded-xl border bg-card/40 backdrop-blur-sm transition-all duration-300 ${
        isDisabled
          ? "border-white/[0.04] opacity-60"
          : "border-white/[0.06] hover:-translate-y-0.5 hover:bg-card/70 hover:border-white/10"
      }`}
      style={{ borderColor: isDisabled ? undefined : `${accent.solid}22` }}
    >
      {/* hover glow */}
      {!isDisabled && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-500 group-hover/sub:opacity-100"
          style={{
            background: `radial-gradient(120% 80% at 50% 0%, ${accent.glow}, transparent 60%)`,
          }}
        />
      )}

      {/* 头部：编号 + status badge + 协议徽章 */}
      <div className="relative flex items-start justify-between gap-2 px-5 pt-4">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] tracking-widest uppercase"
            style={{ color: accent.solid }}
          >
            {page.number}
          </span>
          <StatusBadge status={page.status} />
          {page.week && (
            <span className="text-muted-foreground/55 font-mono text-[10px]">{page.week}</span>
          )}
        </div>
        {!isDisabled && (
          <ArrowUpRight
            className="text-muted-foreground/40 group-hover/sub:text-foreground/80 size-4 -translate-y-0.5 translate-x-0.5 transition-all group-hover/sub:translate-x-0 group-hover/sub:-translate-y-1"
            aria-hidden
          />
        )}
      </div>

      {/* 标题 + 描述 */}
      <div className="relative flex-1 px-5 pt-2 pb-4">
        <h3 className="text-foreground/95 mb-1.5 text-[15px] font-semibold leading-tight tracking-tight">
          {page.title}
        </h3>
        <p className="text-muted-foreground/85 text-[12.5px] leading-relaxed">{page.description}</p>
      </div>

      {/* footer：stats + 协议 */}
      {(page.stats || page.protocol) && (
        <div className="border-foreground/5 relative flex items-center justify-between gap-3 border-t px-5 py-2.5 font-mono text-[10px]">
          {page.stats ? <span className="text-foreground/70">{page.stats}</span> : <span />}
          <span
            className="rounded px-1.5 py-0.5 tracking-wider uppercase"
            style={{
              backgroundColor: `${accent.solid}1a`,
              color: accent.solid,
            }}
          >
            {page.protocol ?? badgeLabel}
          </span>
        </div>
      )}
    </div>
  );

  // planned 状态的子页不可点击；其它包一层 Link
  if (isDisabled) {
    return inner;
  }
  return (
    <Link
      href={page.href}
      aria-label={`进入 ${page.title}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      style={{ "--tw-ring-color": accent.solid } as React.CSSProperties}
    >
      <span className="sr-only">进入 {page.title}</span>
      {inner}
    </Link>
  );
}

function StatusBadge({ status }: { status: SubPageStatus }) {
  const config = {
    done: { color: "oklch(0.7 0.18 150)", label: "✓ done", bg: "oklch(0.7 0.18 150 / 0.12)" },
    wip: { color: "oklch(0.82 0.16 75)", label: "◐ wip", bg: "oklch(0.82 0.16 75 / 0.12)" },
    planned: { color: "oklch(0.6 0.02 280)", label: "○ planned", bg: "oklch(0.6 0.02 280 / 0.1)" },
  } as const;
  const c = config[status];
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wide"
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      {c.label}
    </span>
  );
}
