import { ArrowRight, Bot, Code2, Eye, Radio } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Lab {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Radio;
  badge: string;
  status: "ready" | "wip";
}

const LABS: Lab[] = [
  {
    id: "streaming",
    title: "Lab 1 · Streaming UI Protocols",
    description:
      "把 LLM / Agent 的输出边生成边渲染：Markdown、AG-UI、A2UI 协议对照，支持时间轴回放。",
    href: "/labs/streaming",
    icon: Radio,
    badge: "协议",
    status: "wip",
  },
  {
    id: "codegen",
    title: "Lab 2 · Generate UI Code & DSL",
    description:
      "LLM 直接生成可执行 TSX（沙箱运行） vs 生成 JSON-UI DSL（引擎渲染）。包含 TSX↔DSL 反向、低代码模式。",
    href: "/labs/codegen",
    icon: Code2,
    badge: "生成",
    status: "wip",
  },
  {
    id: "workbench",
    title: "Lab 3 · Engine Debug Workbench",
    description:
      "Artifact 风格三栏调试台：左源码/DSL、中过程事件、右实时渲染。节点 Inspector + 错误热力 + 离线 Replay。",
    href: "/labs/workbench",
    icon: Eye,
    badge: "调试",
    status: "wip",
  },
  {
    id: "observability",
    title: "Lab 4 · Agent Observability",
    description:
      "把 AI 生成 UI 的过程打开来看：思维链/ReAct/Plan 三种模式、token 成本、工具调用回放、UI 评分。",
    href: "/labs/observability",
    icon: Bot,
    badge: "可观测",
    status: "wip",
  },
];

// 最近会话占位数据 —— W9 接入真实 IndexedDB
const RECENT_SESSIONS = [
  {
    id: "demo-1",
    title: "Streaming Markdown demo",
    lab: "streaming",
    updatedAt: "今天 21:24",
  },
  {
    id: "demo-2",
    title: "AG-UI v0.2 protocol probe",
    lab: "streaming",
    updatedAt: "今天 20:11",
  },
  {
    id: "demo-3",
    title: "JSON-UI DSL · dashboard",
    lab: "codegen",
    updatedAt: "昨天 18:42",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:py-16">
      {/* Hero */}
      <section className="mb-12">
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="secondary">v0.1 · W1 scaffold</Badge>
          <Badge variant="outline">Next.js 16 · React 19 · Zustand 5</Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">GenUI Labs</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed">
          一个面向<span className="text-foreground font-semibold">生成式 UI</span>
          的实验性工作台。覆盖 UI 协议流式渲染、LLM 生成 UI 代码/DSL、渲染引擎调试、Agent 可观测。
        </p>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
          详见 <code className="text-foreground">PROPOSAL.md</code>。
        </p>
      </section>

      {/* Lab 入口卡片 */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">四个 Lab</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {LABS.map((lab) => {
            const Icon = lab.icon;
            return (
              <Card key={lab.id} className="group hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary rounded-md p-2">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle className="text-base leading-tight">{lab.title}</CardTitle>
                    </div>
                    <Badge variant="outline">{lab.badge}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {lab.description}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <Link href={lab.href}>
                      进入 Lab
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 最近会话 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">最近会话</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/labs/streaming">查看全部</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {RECENT_SESSIONS.map((s) => (
                <li
                  key={s.id}
                  className="hover:bg-muted/50 flex items-center justify-between gap-4 px-6 py-3 text-sm transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {s.lab}
                    </Badge>
                    <span className="font-medium">{s.title}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{s.updatedAt}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
