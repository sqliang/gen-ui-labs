import { ArrowRight, CircleDashed, CircleDot, Compass, Milestone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LABS } from "@/core/labs";

export const metadata: Metadata = {
  title: "About · GenUI Labs",
  description: "GenUI Labs 的定位、设计原则、12 周路线图、当前已交付模块。",
};

const PRINCIPLES = [
  {
    name: "协议先行",
    desc: "UI 描述先抽象成事件流，渲染是事件流的投影。",
  },
  {
    name: "Lab 隔离",
    desc: "每个 Lab 自包含可独立运行，共享 Core 但不互相耦合。",
  },
  {
    name: "DSL 渐进",
    desc: "从 JSON-UI 起，先能用，再好用。",
  },
  {
    name: "沙箱永远在线",
    desc: "任何 LLM 生成的 UI 代码默认在 iframe 隔离环境跑。",
  },
  {
    name: "失败是数据",
    desc: "失败模式库是核心资产，不是边角料。",
  },
  {
    name: "状态分层",
    desc: 'Zustand 只补"跨组件 + 高频 + 不入 URL"的一块短板。',
  },
] as const;

const ROADMAP = [
  { week: "W1", title: "脚手架 + 主题", status: "done", note: "Next.js 16 + shadcn + 4 Lab 路由" },
  {
    week: "W2",
    title: "多模型 provider + SSE",
    status: "done",
    note: "13 models / 6 providers · fetchSse",
  },
  {
    week: "W3",
    title: "Markdown 协议 + Zod 校验",
    status: "done",
    note: "react-markdown + 4 真实 provider",
  },
  { week: "W4", title: "AG-UI 协议端到端", status: "done", note: "aguiAdapter + 三栏调试视图" },
  { week: "W5", title: "A2UI 协议 + 对照台", status: "wip", note: "1.1.3 + 1.1.4" },
  { week: "W6", title: "JSON-UI DSL 引擎", status: "wip", note: "8 类节点 · SSE patch 流" },
  { week: "W7", title: "TSX 沙箱（@babel/standalone）", status: "planned", note: "" },
  { week: "W8", title: "混合：DSL + 自由代码", status: "planned", note: "" },
  { week: "W9", title: "Lab 3 三栏 Workbench", status: "planned", note: "" },
  { week: "W10", title: "Inspector / 错误热力 / Replay", status: "planned", note: "" },
  { week: "W11", title: "Lab 4 推理 DAG + Token + 评分", status: "planned", note: "" },
  { week: "W12", title: "Prompt Lab + 失败模式库 + 文档", status: "planned", note: "" },
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-12 pb-16">
      {/* Header */}
      <header className="mb-10">
        <p className="text-muted-foreground/60 font-mono text-[11px] tracking-widest uppercase">
          about · manifesto
        </p>
        <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
          一个面向 GenUI 的实验性工作台
        </h1>
        <p className="text-muted-foreground/85 mt-4 max-w-2xl text-[14px] leading-relaxed">
          GenUI Labs 不是一个产品，而是一个
          <b className="text-foreground">能看到结果、能调参数、能复现</b>的 实验性工作台。它把生成式
          UI 的几个核心问题拆成 4 个并列的 Lab， 每个 Lab 都是真能跑的模块。
        </p>
      </header>

      {/* Manifesto */}
      <section className="mb-12">
        <h2 className="text-muted-foreground/70 mb-3 flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase">
          <Compass className="size-3.5" /> design principles
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <Card key={p.name} className="bg-card/30 border-foreground/5">
              <CardContent className="p-3.5">
                <div className="text-foreground/95 font-mono text-[12.5px] font-medium">
                  {p.name}
                </div>
                <p className="text-muted-foreground/80 mt-1 text-[12.5px] leading-relaxed">
                  {p.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section className="mb-12">
        <h2 className="text-muted-foreground/70 mb-3 flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase">
          <Milestone className="size-3.5" /> 12-week roadmap
        </h2>
        <div className="border-foreground/10 overflow-hidden rounded-md border">
          {ROADMAP.map((r, i) => (
            <RoadmapRow key={r.week} {...r} index={i} />
          ))}
        </div>
      </section>

      {/* Labs overview */}
      <section className="mb-10">
        <h2 className="text-muted-foreground/70 mb-3 font-mono text-[11px] tracking-widest uppercase">
          the four labs
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LABS.map((lab) => (
            <Link
              key={lab.id}
              href={lab.href}
              className="border-foreground/10 hover:border-foreground/30 bg-card/30 group block rounded-md border p-3 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[10px] tracking-wider uppercase"
                  style={{ color: lab.accent.solid }}
                >
                  lab {lab.number}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-foreground/95 text-[13px] font-medium">{lab.title}</span>
              </div>
              <p className="text-muted-foreground/80 mt-1.5 text-[12.5px] leading-relaxed">
                {lab.description}
              </p>
              <div className="text-muted-foreground/60 mt-2 flex items-center gap-1 font-mono text-[10.5px]">
                {lab.subPages.length} sub-pages
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href="/">回到首页</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/labs/streaming">从 Lab 1 开始</Link>
        </Button>
        <Button asChild variant="ghost">
          <a
            href="https://github.com/sqliang/gen-ui-labs/blob/main/PROPOSAL.md"
            target="_blank"
            rel="noreferrer noopener"
          >
            完整方案 PROPOSAL.md ↗
          </a>
        </Button>
      </div>
    </div>
  );
}

function RoadmapRow({
  week,
  title,
  status,
  note,
  index,
}: {
  week: string;
  title: string;
  status: "done" | "wip" | "planned";
  note: string;
  index: number;
}) {
  const meta = {
    done: {
      icon: <CircleDot className="size-3 text-emerald-400" />,
      label: "done",
      cls: "text-emerald-300/90",
    },
    wip: {
      icon: <CircleDot className="size-3 text-amber-400" />,
      label: "wip",
      cls: "text-amber-300/90",
    },
    planned: {
      icon: <CircleDashed className="text-muted-foreground/50 size-3" />,
      label: "planned",
      cls: "text-muted-foreground/60",
    },
  }[status];

  return (
    <div
      className={`hover:bg-foreground/[0.02] flex items-center gap-3 px-3 py-2 transition-colors ${
        index % 2 === 0 ? "" : "bg-foreground/[0.015]"
      }`}
    >
      <span className="text-muted-foreground/60 w-10 font-mono text-[11px]">{week}</span>
      <span className="text-foreground/90 flex-1 text-[12.5px]">{title}</span>
      {note ? (
        <span className="text-muted-foreground/60 hidden font-mono text-[10.5px] sm:inline">
          {note}
        </span>
      ) : null}
      <span
        className={`flex w-16 items-center justify-end gap-1 font-mono text-[10px] tracking-wider uppercase ${meta.cls}`}
      >
        {meta.icon}
        {meta.label}
      </span>
    </div>
  );
}
