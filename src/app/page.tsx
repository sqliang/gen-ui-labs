import { ArrowDown, Code2, Terminal } from "lucide-react";
import Link from "next/link";
import { LabCard } from "@/components/home/lab-card";
import { LiveTokenStream } from "@/components/home/live-token-stream";
import { RecentSessionsSection } from "@/components/home/recent-sessions";
import { Button } from "@/components/ui/button";
import { LABS } from "@/core/labs";
import { BUILTIN_MODELS } from "@/core/models/registry";

// 站点级数据 —— 自动从 registry 派生，避免和 core 数据双写
const PROVIDER_COUNT = new Set(BUILTIN_MODELS.map((m) => m.provider)).size;
const STATS = [
  { label: "labs", value: String(LABS.length), hint: "并行实验区" },
  {
    label: "models",
    value: String(BUILTIN_MODELS.length),
    hint: `${PROVIDER_COUNT} 个 provider`,
  },
  { label: "tests", value: "120", hint: "vitest · green" },
  { label: "scenarios", value: "5", hint: "long · tools · error · reconnect · default" },
] as const;

export default function HomePage() {
  return (
    <main className="relative w-full">
      {/* 背景层：点阵网格 + 顶部光晕 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, oklch(0.5 0 0 / 0.18) 1px, transparent 0)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 80%)",
          }}
        />
        <div
          className="absolute top-[-20%] left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.55 0.22 290 / 0.4), transparent 70%)",
          }}
        />
        <div
          className="absolute top-[10%] left-[10%] h-[400px] w-[600px] rounded-full opacity-40 blur-3xl"
          style={{
            background: "radial-gradient(closest-side, oklch(0.6 0.18 230 / 0.3), transparent 70%)",
          }}
        />
      </div>

      {/* === Hero === */}
      <section className="mx-auto max-w-[1280px] px-6 pt-16 pb-20 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          {/* 左：标题区 */}
          <div>
            <div className="mb-6 flex items-center gap-2 font-mono text-[11px]">
              <span className="border-border/40 bg-secondary/30 text-foreground/80 inline-flex items-center gap-1.5 rounded-md border px-2 py-1">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_oklch(0.7_0.18_150)]" />
                v0.1 · w5 active
              </span>
              <span className="text-muted-foreground/70 hidden sm:inline">
                next.js 16 · react 19 · zustand 5 · deepseek real-sse verified
              </span>
            </div>

            <h1 className="text-foreground text-[44px] leading-[1.05] font-semibold tracking-[-0.02em] sm:text-[56px] lg:text-[64px]">
              <span className="block">协议驱动的</span>
              <span className="block">
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(120deg, oklch(0.85 0.16 230) 0%, oklch(0.78 0.18 290) 50%, oklch(0.82 0.16 75) 100%)",
                  }}
                >
                  生成式 UI
                </span>{" "}
                <span className="text-foreground/70">实验室</span>
              </span>
            </h1>

            <p className="text-muted-foreground/90 mt-6 max-w-xl text-[15px] leading-relaxed sm:text-[16px]">
              把 LLM / Agent 的输出打开来看：流式协议、UI 代码生成、引擎调试、推理可观测。 四个 Lab
              并列，每个都能"看到结果、调参数、复现"。
            </p>

            {/* 终端风格的标签 */}
            <div className="border-foreground/10 bg-foreground/[0.03] mt-7 inline-flex max-w-xl items-center gap-2 rounded-md border px-3 py-2 font-mono text-[11px] text-muted-foreground/90">
              <Terminal className="text-foreground/70 size-3.5" />
              <span className="text-foreground/85">cat</span>
              <span className="text-amber-300">PROPOSAL.md</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="text-foreground/70">
                一个面向 GenUI 的实验性工作台（12 周路线图）
              </span>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="group/cta relative h-11 gap-2 overflow-hidden rounded-md px-5 font-mono text-[12px]"
              >
                <Link href="/labs/streaming">
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    进入 Lab 1
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-0 opacity-0 transition-opacity group-hover/cta:opacity-100"
                    style={{
                      background:
                        "linear-gradient(90deg, oklch(0.78 0.16 230), oklch(0.74 0.18 290))",
                    }}
                  />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-border/40 bg-card/40 hover:bg-card/70 h-11 gap-2 rounded-md px-4 font-mono text-[12px] backdrop-blur-sm"
              >
                <a
                  href="https://github.com/sqliang/gen-ui-labs"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Code2 className="size-3.5" />
                  github
                  <span className="text-muted-foreground/50">↗</span>
                </a>
              </Button>
              <span className="text-muted-foreground/60 font-mono text-[11px]">
                <ArrowDown className="mr-1 inline size-3 -translate-y-0.5" />
                向下滚动看 4 个 Lab
              </span>
            </div>

            {/* 数据条 */}
            <div className="mt-10 grid max-w-xl grid-cols-4 gap-px overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
              {STATS.map((s) => (
                <div key={s.label} className="bg-background/40 px-3 py-3 backdrop-blur-sm">
                  <div className="text-foreground/90 font-mono text-[20px] font-semibold tracking-tight">
                    {s.value}
                  </div>
                  <div className="text-muted-foreground/80 mt-0.5 font-mono text-[10px] lowercase">
                    {s.label}
                  </div>
                  <div className="text-muted-foreground/55 mt-0.5 text-[10px]">{s.hint}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 右：live token stream */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-2xl bg-gradient-to-br from-sky-500/10 via-purple-500/10 to-amber-500/10 opacity-60 blur-2xl" />
            <LiveTokenStream />
            {/* 小脚注：解释这个 widget 是什么 */}
            <div className="text-muted-foreground/60 mt-3 text-center font-mono text-[10px]">
              ↑ mock stream ·{" "}
              <Link href="/labs/streaming" className="text-foreground/80 hover:underline">
                真实 ag-ui 流 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* === Lab 卡片网格 === */}
      <section className="mx-auto max-w-[1280px] px-6 pb-20">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-muted-foreground/60 font-mono text-[11px] tracking-widest uppercase">
              4 labs · parallel experiments
            </div>
            <h2 className="text-foreground/95 mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              选一个 Lab 进去看
            </h2>
          </div>
          <div className="text-muted-foreground/70 hidden max-w-md text-right text-[12px] sm:block">
            每张卡片都是真实可跑的 mini-demo，不只是介绍。
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {LABS.map((lab) => (
            <LabCard key={lab.id} lab={lab} />
          ))}
        </div>
      </section>

      {/* === 最近会话 === */}
      <RecentSessionsSection />

      {/* === 底部脚注 === */}
      <footer className="border-border/30 mx-auto max-w-[1280px] border-t px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-muted-foreground/60">
          <div className="flex items-center gap-3">
            <span>genui/labs</span>
            <span>·</span>
            <span>built with next 16, react 19, tailwind v4</span>
          </div>
          <div className="flex items-center gap-3">
            <span>no telemetry</span>
            <span>·</span>
            <span>open source</span>
            <span>·</span>
            <span>made for genui research</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
