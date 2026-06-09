"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStreamingStore } from "@/core/state/streaming-store";
import { useWorkbenchStore } from "@/core/state/workbench-store";

export default function WorkbenchPage() {
  const { accumulatedText, chunks, isStreaming } = useStreamingStore();
  const { selectedNode, scrubberPosition, setScrubberPosition } = useWorkbenchStore();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">Lab 3 · Workbench</h1>
        <Badge variant="outline">W9 · 三栏调试台</Badge>
        <p className="text-muted-foreground mt-1 text-sm">源码 → 渲染 → 检查 → 回放</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs">源码 / Prompt</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <textarea
              className="bg-muted border-input font-mono text-[11px] w-full min-h-[20rem] rounded-md border p-3"
              placeholder="在 Lab 1/2 中发起流式渲染..."
              readOnly
              value=""
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs">
              渲染结果
              {isStreaming ? (
                <Badge variant="default" className="ml-2 font-mono text-[8px]">
                  live
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="prose prose-sm dark:prose-invert min-h-[20rem] max-w-none overflow-auto rounded p-2">
              {accumulatedText
                ? accumulatedText.split("\n").map((line, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: text lines
                    <p key={i}>{line || "\u00A0"}</p>
                  ))
                : "在 Lab 1/2 中发起流式渲染，这里实时显示。"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs">
              检查器
              {selectedNode ? (
                <Badge variant="secondary" className="ml-2 font-mono text-[8px]">
                  {selectedNode.nodeId}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-3">
              <div>
                <label htmlFor="scrubber" className="text-muted-foreground text-[10px] block mb-1">
                  时间轴
                </label>
                <input
                  id="scrubber"
                  type="range"
                  min={0}
                  max={Math.max(chunks.length, 1)}
                  step={1}
                  value={scrubberPosition}
                  onChange={(e) => setScrubberPosition(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-muted-foreground mt-0.5 text-[9px]">
                  {scrubberPosition}/{chunks.length} chunks
                </div>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] block mb-1">事件日志</span>
                <pre className="bg-muted max-h-[12rem] overflow-auto rounded p-2 font-mono text-[9px]">
                  {chunks
                    .slice(0, 10)
                    .map(
                      (c, i) =>
                        `${i}: ${c.kind}${c.kind === "text" ? ` "${c.delta.slice(0, 20)}"` : ""}\n`,
                    )}
                  {chunks.length > 10 ? `\n... 共 ${chunks.length} 条` : ""}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
