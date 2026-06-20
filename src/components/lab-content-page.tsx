import { ArrowRight, Loader2, Pause, Play, RotateCcw, Square } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getLab, type LabId } from "@/core/labs";

/**
 * Lab 子页通用外壳。
 *
 * 设计：
 * - LabHeader：lab 编号 + 协议标识 + 标题 + 描述 + status 徽章
 *   跟首页 / Lab hub 视觉一致 —— 站点内任何"Lab *.*.*" 页面都有同样的头部骨架
 * - ControlBar：开始/停止/清空按钮组 + 状态文字 + 自定义扩展
 * - ErrorBanner：错误时显示
 * - OutputCard：统一的输出容器（带标题栏 + 内容 + 状态指示）
 *
 * 这样所有 7 个子页的"页面骨架"都是一致的，差异只在业务区。
 */

export interface LabContentPageProps {
  /** Lab id，用于从 core/labs.ts 读取 accent / number / title */
  labId: LabId;
  /** 子页面编号，例 "1.1.1" */
  subNumber: string;
  /** 子页面标题 */
  title: string;
  /** 周次 + 协议说明 */
  protocolLabel: string;
  /** 一句话描述 */
  description: string;
  /** 主要操作按钮组的右侧状态区 */
  status?: ReactNode;
  /** 是否正在 streaming */
  isStreaming?: boolean;
  /** 错误信息 */
  errorMsg?: string | null;
  /** 点击开始 */
  onStart?: () => void;
  /** 点击停止 */
  onStop?: () => void;
  /** 点击重置 */
  onReset?: () => void;
  /** 开始按钮文字，默认"开始流式渲染" */
  startLabel?: string;
  /** 顶部 description 下方的额外工具条（prompt preset、toggle 等） */
  toolbar?: ReactNode;
  /** 输出区内容 */
  output: ReactNode;
  /** 输出区标题 */
  outputTitle?: string;
  /** 输出区标题右侧附加 */
  outputExtra?: ReactNode;
  /** 输出区是否空态 */
  outputEmpty?: boolean;
  /** 空态提示 */
  outputEmptyHint?: ReactNode;
}

export function LabContentPage({
  labId,
  subNumber,
  title,
  protocolLabel,
  description,
  status,
  isStreaming,
  errorMsg,
  onStart,
  onStop,
  onReset,
  startLabel = "开始流式渲染",
  toolbar,
  output,
  outputTitle,
  outputExtra,
  outputEmpty,
  outputEmptyHint,
}: LabContentPageProps) {
  const lab = getLab(labId);

  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-6 pt-6 pb-16"
      style={
        {
          "--lab-accent": lab.accent.solid,
          "--lab-accent-soft": lab.accent.soft,
          "--lab-accent-glow": lab.accent.glow,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span
              className="rounded-md px-2 py-1"
              style={{
                backgroundColor: lab.accent.soft,
                color: lab.accent.solid,
                boxShadow: `inset 0 0 0 1px ${lab.accent.solid}33`,
              }}
            >
              {subNumber}
            </span>
            <span className="text-muted-foreground/70">{protocolLabel}</span>
            {isStreaming ? <StreamingBadge /> : null}
            {status}
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[28px]">
            {title}
          </h1>
          <p className="text-muted-foreground/85 mt-2 max-w-2xl text-[13.5px] leading-relaxed">
            {description}
          </p>
        </div>
      </header>

      {/* Toolbar (preset / toggle) */}
      {toolbar ? <div className="mb-4">{toolbar}</div> : null}

      {/* Control bar */}
      {(onStart || onStop || onReset) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {onStart ? (
            <Button onClick={onStart} disabled={isStreaming} size="sm" className="gap-1.5">
              {isStreaming ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  流式中…
                </>
              ) : (
                <>
                  <Play className="size-3" />
                  {startLabel}
                </>
              )}
            </Button>
          ) : null}
          {onStop ? (
            <Button
              onClick={onStop}
              variant="outline"
              size="sm"
              disabled={!isStreaming}
              className="gap-1.5"
            >
              <Square className="size-3" />
              停止
            </Button>
          ) : null}
          {onReset ? (
            <Button
              onClick={onReset}
              variant="ghost"
              size="sm"
              disabled={isStreaming}
              className="gap-1.5"
            >
              <RotateCcw className="size-3" />
              清空
            </Button>
          ) : null}
        </div>
      )}

      {/* Error */}
      {errorMsg ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
          style={{
            backgroundColor: "oklch(0.577 0.245 27.325 / 0.08)",
            borderColor: "oklch(0.577 0.245 27.325 / 0.4)",
            color: "oklch(0.78 0.16 27)",
          }}
        >
          <span className="font-mono text-xs font-bold">ERR</span>
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {/* Output */}
      <section className="bg-card/30 border-foreground/5 overflow-hidden rounded-xl border backdrop-blur-sm">
        {outputTitle ? (
          <header className="border-foreground/5 flex items-center justify-between gap-2 border-b px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ backgroundColor: lab.accent.solid }}
              />
              <h2 className="text-foreground/90 font-mono text-[12px] font-medium">
                {outputTitle}
              </h2>
              {isStreaming ? (
                <span className="font-mono text-[10px] text-muted-foreground/70">streaming…</span>
              ) : null}
            </div>
            <div className="flex items-center gap-3">{outputExtra}</div>
          </header>
        ) : null}
        <div className="p-4">{outputEmpty ? outputEmptyHint : output}</div>
      </section>
    </div>
  );
}

function StreamingBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400/10 px-2 py-1 font-mono text-[10px] tracking-wide text-emerald-300">
      <span className="relative inline-flex">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-block size-1.5 rounded-full bg-emerald-400" />
      </span>
      streaming
    </span>
  );
}

/* ───── Toolbar 组件 ───── */

export function PresetChips<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all disabled:opacity-40 ${
              active
                ? "border-foreground/30 bg-foreground/[0.06] text-foreground"
                : "border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function SourceToggle<V extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { label: string; value: V; hint?: string }[];
  value: V;
  onChange: (v: V) => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-foreground/10 inline-flex items-center gap-1 rounded-md border bg-foreground/[0.02] p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={`rounded px-2.5 py-1 font-mono text-[11px] transition-all disabled:opacity-40 ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground/70 font-mono text-[11px] uppercase tracking-wider">
        {label}
      </span>
      {children}
      {hint ? <span className="text-muted-foreground/60 font-mono text-[11px]">{hint}</span> : null}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`border-foreground/15 bg-foreground/[0.02] placeholder:text-muted-foreground/40 focus-visible:border-foreground/30 focus-visible:ring-foreground/15 w-full rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${className ?? ""}`}
    />
  );
}

export function StatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "accent" | "success" | "warn" | "danger";
}) {
  const map = {
    muted: "bg-foreground/[0.04] text-muted-foreground/80 border-foreground/10",
    accent: "bg-foreground/[0.06] text-foreground/90 border-foreground/15",
    success: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    warn: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    danger: "bg-rose-400/10 text-rose-300 border-rose-400/30",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-wide ${map[tone]}`}
    >
      {label}
    </span>
  );
}

/* ───── Utility for "→" arrow between flow chips ───── */
export function FlowArrow() {
  return <ArrowRight className="text-muted-foreground/50 size-3.5 shrink-0" aria-hidden />;
}

/* ───── Pause icon placeholder (not directly used but exported) ───── */
export function PauseIcon() {
  return <Pause className="size-3" aria-hidden />;
}
