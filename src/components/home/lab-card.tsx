import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { CodegenMiniDemo } from "@/components/home/codegen-mini-demo";
import { ObservabilityMiniDemo } from "@/components/home/observability-mini-demo";
import { StreamingMiniDemo } from "@/components/home/streaming-mini-demo";
import { WorkbenchMiniDemo } from "@/components/home/workbench-mini-demo";
import type { LabDefinition } from "@/core/labs";

/**
 * 单个 Lab 卡片 —— 替代默认的 shadcn Card。
 *
 * 设计：
 * - 不再是白底灰边的扁平卡片，而是带 accent 边 + hover 时 accent glow 抬升
 * - 左上角是 Lab 编号 + 标题 + 协议标识（看起来像"工具卡"）
 * - 中间是 feature 列表（3-4 条要点）
 * - 底部是 mini-demo 区（独立的"窗口"感）
 *
 * 实现要点：
 * - 外层是 <div>，里面用绝对定位的 <Link> 覆盖整张卡做"整卡可点"。
 * - mini-demo 区用 relative + z-index 浮在 Link 之上，独立接管事件。
 *   这样可以避免 <button> / <a> 嵌套导致 HTML 无效（之前整个 Link 被拆掉，点击失活）。
 */
export function LabCard({ lab }: { lab: LabDefinition }) {
  const Icon = lab.icon;
  return (
    <div
      className="group bg-card/40 hover:bg-card/70 relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10"
      style={
        {
          "--lab-accent": lab.accent.solid,
          "--lab-accent-soft": lab.accent.soft,
          "--lab-accent-glow": lab.accent.glow,
        } as React.CSSProperties
      }
    >
      {/* hover 时浮起的 accent glow —— 装饰层，不能拦截点击 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, var(--lab-accent-glow), transparent 60%)`,
        }}
      />

      {/* 顶部：编号 + 标题 + 协议 + arrow */}
      <div className="relative flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor: lab.accent.soft,
              color: lab.accent.solid,
              boxShadow: `inset 0 0 0 1px ${lab.accent.solid}33`,
            }}
          >
            <Icon className="size-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-[10px] tracking-widest uppercase"
                style={{ color: lab.accent.solid }}
              >
                lab {lab.number}
              </span>
              <span className="text-muted-foreground/50 font-mono text-[10px]">·</span>
              <span className="text-muted-foreground/70 font-mono text-[10px]">
                {lab.protocolLabel}
              </span>
            </div>
            <h3 className="text-foreground/95 mt-1 text-[15px] font-semibold leading-tight tracking-tight">
              {lab.title}
            </h3>
          </div>
        </div>
        <ArrowUpRight
          className="text-muted-foreground/40 group-hover:text-foreground/80 size-4 -translate-y-0.5 translate-x-0.5 transition-all group-hover:translate-x-0 group-hover:-translate-y-1"
          aria-hidden
        />
      </div>

      {/* 描述 */}
      <p className="text-muted-foreground/85 relative mx-5 mt-3 text-[13px] leading-relaxed">
        {lab.description}
      </p>

      {/* feature 列表 */}
      <ul className="text-foreground/80 relative mx-5 mt-4 space-y-1.5 text-[12px]">
        {lab.features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span
              className="inline-block size-1 rounded-full"
              style={{ backgroundColor: lab.accent.solid }}
            />
            {f}
          </li>
        ))}
      </ul>

      {/* mini-demo 区 —— 浮在 Link 之上，独立接管事件（防止 button 嵌套 a 的 HTML 冲突） */}
      <div
        className="relative z-10 mt-5 mx-5 mb-5 overflow-hidden rounded-lg border bg-black/30 p-3"
        style={{ borderColor: `${lab.accent.solid}22` }}
      >
        {/* 模拟窗口 chrome */}
        <div className="mb-2 flex items-center gap-1">
          <span className="bg-foreground/15 size-1.5 rounded-full" />
          <span className="bg-foreground/15 size-1.5 rounded-full" />
          <span className="bg-foreground/15 size-1.5 rounded-full" />
          <span className="ml-2 font-mono text-[9px] text-muted-foreground/50">
            ~/labs/{lab.id}
          </span>
          <span
            className="ml-auto font-mono text-[9px] tracking-wider uppercase"
            style={{ color: lab.accent.solid }}
          >
            {lab.badge}
          </span>
        </div>
        <LabMiniDemo id={lab.miniDemo} />
      </div>

      {/* 整卡可点的 anchor —— absolute 覆盖整张卡，位于 mini-demo 之下。
          这保证：点击标题/描述/features 都跳转到 Lab，点击 mini-demo 内部按钮不跳转。 */}
      <Link
        href={lab.href}
        aria-label={`进入 ${lab.title}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ "--tw-ring-color": lab.accent.solid } as React.CSSProperties}
      >
        <span className="sr-only">进入 {lab.title}</span>
      </Link>
    </div>
  );
}

function LabMiniDemo({ id }: { id: LabDefinition["miniDemo"] }) {
  switch (id) {
    case "streaming":
      return <StreamingMiniDemo />;
    case "codegen":
      return <CodegenMiniDemo />;
    case "workbench":
      return <WorkbenchMiniDemo />;
    case "observability":
      return <ObservabilityMiniDemo />;
  }
}
