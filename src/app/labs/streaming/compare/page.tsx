"use client";

import { useState } from "react";

import { LabContentPage, PresetChips, StatusPill } from "@/components/lab-content-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProtocolTab = "markdown" | "ag-ui" | "a2ui";

interface ProtocolInfo {
  id: ProtocolTab;
  label: string;
  status: "done" | "wip" | "planned";
  description: string;
  features: string[];
}

const PROTOCOLS: ProtocolInfo[] = [
  {
    id: "markdown",
    label: "Markdown 协议",
    status: "done",
    description: "最简单的 UI 协议：纯文本流 → Markdown 渲染",
    features: [
      "SSE 文本增量（/api/chat）",
      "react-markdown + GFM + 代码高亮",
      "mock / api 双源切换",
      "AbortController 中断",
      "observability 指标（firstTokenLatencyMs）",
      "debug scenarios（long/tools/error/reconnect）",
    ],
  },
  {
    id: "ag-ui",
    label: "AG-UI 协议",
    status: "done",
    description: "CopilotKit AG-UI 规范：结构化事件流 → RenderableEvent",
    features: [
      "aguiAdapter 映射器（TEXT_MESSAGE_CONTENT → text）",
      "TOOL_CALL_START / ARGS / END 生命周期",
      "RUN_STARTED / RUN_FINISHED 控制事件",
      "/api/ag-ui mock SSE 端点",
      "三栏调试视图（原始事件 / RenderableEvent / 渲染效果）",
      "与 Markdown 协议共用 streaming-store",
    ],
  },
  {
    id: "a2ui",
    label: "A2UI 协议",
    status: "wip",
    description: "A2UI v0.2：surfaceUpdate + dataModelUpdate → 组件树",
    features: [
      "surfaceUpdate 组件声明（card / chart / table / text）",
      "dataModelUpdate 数据绑定",
      "a2uiAdapter 映射器",
      "/api/a2ui mock SSE 端点",
      "三栏视图（原始事件 / 组件树 / RenderableEvent）",
      "与 Markdown / AG-UI 协议对照",
    ],
  },
];

const STATUS_MAP: Record<
  ProtocolInfo["status"],
  { label: string; tone: "success" | "warn" | "muted" }
> = {
  done: { label: "✓ done", tone: "success" },
  wip: { label: "◐ wip", tone: "warn" },
  planned: { label: "○ planned", tone: "muted" },
};

export default function ComparePage() {
  const [activeTab, setActiveTab] = useState<ProtocolTab>("markdown");
  const current = PROTOCOLS.find((p) => p.id === activeTab) ?? PROTOCOLS[0];
  if (!current) return null;
  const status = STATUS_MAP[current.status];

  return (
    <LabContentPage
      labId="streaming"
      subNumber="1.1.4"
      title="协议对照台"
      protocolLabel="W5 · 三协议对照"
      description="Markdown / AG-UI / A2UI 三个 UI 协议的横向对比。三者共用 streaming-store + RenderableEvent 中间表示，差异只在 protocol adapter 和渲染策略。"
      outputTitle="protocol · side-by-side"
      outputExtra={<StatusPill label={status.label} tone={status.tone} />}
      toolbar={
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <span className="text-muted-foreground/70 mb-2 block font-mono text-[11px] uppercase tracking-wider">
            select protocol
          </span>
          <PresetChips
            value={activeTab}
            onChange={setActiveTab}
            options={PROTOCOLS.map((p) => ({ label: p.label, value: p.id }))}
          />
        </div>
      }
      output={
        <div className="space-y-4">
          {/* 协议详情 */}
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-foreground/95 text-[15px] font-semibold">
                  {current.label}
                </CardTitle>
                <StatusPill label={status.label} tone={status.tone} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-muted-foreground/85 mb-4 text-[13px] leading-relaxed">
                {current.description}
              </p>
              <h3 className="text-muted-foreground/70 mb-2 font-mono text-[10px] tracking-widest uppercase">
                features
              </h3>
              <ul className="space-y-1.5">
                {current.features.map((f) => (
                  <li
                    key={f}
                    className="text-foreground/85 flex items-start gap-2 text-[12.5px] leading-relaxed"
                  >
                    <span className="text-foreground/40 mt-1.5 inline-block size-1 shrink-0 rounded-full bg-current" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* RenderableEvent 中间表示 */}
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-4">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                renderableevent · shared IR
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-muted-foreground/85 mb-4 text-[13px] leading-relaxed">
                三种协议各自有 adapter（aguiAdapter / a2uiAdapter / markdown 不需要 adapter），
                统一输出{" "}
                <code className="bg-foreground/10 rounded px-1.5 py-0.5 font-mono text-[12px]">
                  RenderableEvent
                </code>
                ， 走同一个{" "}
                <code className="bg-foreground/10 rounded px-1.5 py-0.5 font-mono text-[12px]">
                  streaming-store
                </code>
                。
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <ProtocolSummary
                  protocol="Markdown"
                  accent="oklch(0.78 0.16 230)"
                  tagline="text chunks"
                />
                <ProtocolSummary
                  protocol="AG-UI"
                  accent="oklch(0.82 0.16 75)"
                  tagline="text + tool + state + control"
                />
                <ProtocolSummary
                  protocol="A2UI"
                  accent="oklch(0.78 0.15 150)"
                  tagline="state + component"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}

function ProtocolSummary({
  protocol,
  accent,
  tagline,
}: {
  protocol: string;
  accent: string;
  tagline: string;
}) {
  return (
    <div
      className="bg-card/40 border-foreground/10 rounded-lg border p-3"
      style={{
        boxShadow: `inset 0 0 0 1px ${accent.replace(")", " / 0.25)")}`,
      }}
    >
      <div
        className="font-mono text-[11px] font-bold tracking-wide uppercase"
        style={{ color: accent }}
      >
        {protocol}
      </div>
      <div className="text-muted-foreground/80 mt-1 font-mono text-[10.5px]">→ {tagline}</div>
    </div>
  );
}
