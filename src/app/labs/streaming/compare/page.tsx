"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    status: "planned",
    description: "A2UI v0.2：surfaceUpdate + dataModelUpdate → 组件树",
    features: [
      "surfaceUpdate 组件声明",
      "dataModelUpdate 数据绑定",
      "a2uiAdapter（W5 落地）",
      "/api/a2ui（W5 落地）",
      "组件树视图 + diff",
      "与 AG-UI 协议对照",
    ],
  },
];

export default function ComparePage() {
  const [activeTab, setActiveTab] = useState<ProtocolTab>("markdown");

  const found = PROTOCOLS.find((p) => p.id === activeTab);
  const current = found ?? PROTOCOLS[0];
  if (!current) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">1.1.3 协议对照台</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          三种 UI 协议的对比：共用 RenderableEvent，各自 protocol adapter
        </p>
      </header>

      {/* 协议 tab 切换 */}
      <div className="mb-6 flex gap-2">
        {PROTOCOLS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={activeTab === p.id ? "default" : "outline"}
            onClick={() => setActiveTab(p.id)}
          >
            {p.label}
            {p.status === "done" ? (
              <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[9px]">
                ✅
              </Badge>
            ) : p.status === "wip" ? (
              <Badge variant="outline" className="ml-1.5 px-1 py-0 text-[9px]">
                🚧
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-1.5 px-1 py-0 text-[9px]">
                📋
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* 协议详情 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
          <CardTitle className="text-base">
            {current.label}
            <Badge
              variant="outline"
              className={cn("ml-2 font-mono text-[10px]", {
                "border-green-500 text-green-600 dark:text-green-400": current.status === "done",
                "border-yellow-500 text-yellow-600 dark:text-yellow-400": current.status === "wip",
                "border-muted-foreground text-muted-foreground": current.status === "planned",
              })}
            >
              {current.status === "done"
                ? "已落地"
                : current.status === "wip"
                  ? "进行中"
                  : "计划中"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-muted-foreground mb-4 text-sm">{current.description}</p>

          <h3 className="text-xs font-semibold mb-2">已实现 / 规划</h3>
          <ul className="space-y-1.5">
            {current.features.map((f, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static feature list, never reordered
              <li key={i} className="text-muted-foreground flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5 text-[10px]">▸</span>
                {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* RenderableEvent 共享说明 */}
      <Card className="mt-4">
        <CardHeader className="p-4">
          <CardTitle className="text-sm">RenderableEvent 中间表示</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-muted-foreground text-sm">
            三种协议各自有 adapter（aguiAdapter / a2uiAdapter / markdown 不需要）， 统一输出{" "}
            <code className="bg-muted rounded px-1 text-xs">RenderableEvent</code>， 走同一个{" "}
            <code className="bg-muted rounded px-1 text-xs">streaming-store</code>。
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
            <div className="bg-muted rounded p-2">
              <span className="text-primary font-bold">Markdown</span>
              <br />
              <span className="text-muted-foreground">text chunks</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-primary font-bold">AG-UI</span>
              <br />
              <span className="text-muted-foreground">text + tool</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-primary font-bold">A2UI</span>
              <br />
              <span className="text-muted-foreground">state + component</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
