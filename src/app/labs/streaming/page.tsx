import { Radio } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SUB_FEATURES = [
  {
    href: "/labs/streaming/markdown",
    label: "1.1.1 Markdown 流式渲染",
    desc: "LLM 输出 Markdown，前端基于 SSE 流式增量解析渲染",
  },
  {
    href: "/labs/streaming/ag-ui",
    label: "1.1.2 AG-UI 协议流式渲染",
    desc: "实现 AG-UI 协议解析器，支持组件事件（TEXT_MESSAGE_CONTENT / TOOL_CALL_START …）",
    badge: "W4",
  },
  {
    href: "/labs/streaming/a2ui",
    label: "1.1.3 A2UI 协议渲染",
    desc: "按 A2UI v0.2 规范解析 surfaceUpdate / dataModelUpdate，还原 JSON-UI",
    badge: "W5",
  },
  {
    href: "/labs/streaming/compare",
    label: "1.1.4 协议对照台",
    desc: "同一条 prompt，分别用 AG-UI / A2UI / Markdown 三路流式渲染，肉眼对比差异",
    badge: "W5",
  },
];

export default function StreamingLabOverview() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:py-10">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Radio className="text-primary size-5" />
          <h1 className="text-2xl font-bold tracking-tight">Lab 1 · Streaming UI Protocols</h1>
        </div>
        <p className="text-muted-foreground">
          把 LLM / Agent 的输出<span className="text-foreground font-medium">边生成边渲染</span>
          ，比较不同协议与渲染策略。
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">子功能</h2>
        <div className="space-y-2">
          {SUB_FEATURES.map((f) => (
            <Link key={f.href} href={f.href} className="block">
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{f.label}</CardTitle>
                      {"badge" in f && f.badge ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {f.badge}
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription className="mt-1 text-xs">{f.desc}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Separator className="my-8" />

      <section className="text-muted-foreground text-xs leading-relaxed">
        <p>当前为 W1 脚手架占位。每个子页签后续会接入真实的协议解析器与流式 SSE 通道。</p>
      </section>
    </div>
  );
}
