"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AguiEvent, aguiAdapter } from "@/core/protocols/ag-ui/mapper";
import { useStreamingStore } from "@/core/state/streaming-store";
import { fetchSse } from "@/infra/http/sse-client";

/**
 * Lab 1.1.2 AG-UI 流式协议渲染。
 *
 * W4-3 升级：从占位页改为真正消费 /api/ag-ui 的 AG-UI 事件流。
 *
 * AG-UI 事件 → aguiAdapter.adapt() → RenderableEvent → streaming-store。
 * 渲染分三栏：
 * 1. 原始事件 JSON（左侧）
 * 2. 转换后的 RenderableEvent（中间）
 * 3. 可视效果（右侧，MarkdownRenderer 渲染文本内容）
 */
export default function AguiPage() {
  const { chunks, accumulatedText, isStreaming, start, append, finish, reset } =
    useStreamingStore();
  const [rawEvents, setRawEvents] = useState<AguiEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = async () => {
    start("ag-ui");
    setErrorMsg(null);
    setRawEvents([]);

    try {
      for await (const evt of fetchSse("/api/ag-ui", { body: {} })) {
        let agui: AguiEvent;
        try {
          agui = JSON.parse(evt.data) as AguiEvent;
        } catch {
          continue;
        }
        setRawEvents((prev) => [...prev, agui]);
        const re = aguiAdapter.adapt(agui);
        append(re);
        if (re.kind === "control" && re.type === "end") break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      finish();
    }
  };

  const handleStop = () => finish();

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">1.1.2 AG-UI 协议流式</h1>
          <Badge variant="outline">W4-3 · AG-UI</Badge>
          {isStreaming ? (
            <Badge variant="default" className="font-mono text-[10px]">
              streaming…
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          AG-UI v0.2 → <code>aguiAdapter</code> → RenderableEvent → 渲染
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        <Button onClick={handleStart} disabled={isStreaming}>
          {isStreaming ? "流式中…" : "开始 AG-UI 流式"}
        </Button>
        <Button onClick={handleStop} variant="outline" disabled={!isStreaming}>
          停止
        </Button>
        <Button onClick={reset} variant="ghost" disabled={isStreaming}>
          清空
        </Button>
      </div>

      {errorMsg ? (
        <Card className="mb-4 border-destructive/50">
          <CardContent className="p-3 text-destructive text-sm">
            <strong>错误：</strong>
            {errorMsg}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        {/* 左：原始 AG-UI 事件 */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs">AG-UI 原始事件</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <pre className="bg-muted max-h-[28rem] overflow-auto rounded p-2 font-mono text-[10px] leading-relaxed">
              {rawEvents.length > 0
                ? rawEvents.map((e, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static mock event list, no reorder
                    <div key={`raw-${i}`} className="border-muted border-b pb-1 mb-1">
                      <span className="text-primary font-bold">{e.type}</span>
                      {"\n"}
                      {JSON.stringify(e, null, 1)}
                    </div>
                  ))
                : "点击「开始」"}
            </pre>
          </CardContent>
        </Card>

        {/* 中：RenderableEvent */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs">
              RenderableEvent
              <span className="text-muted-foreground ml-1 font-normal">
                ({chunks.length} chunks)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <pre className="bg-muted max-h-[28rem] overflow-auto rounded p-2 font-mono text-[10px] leading-relaxed">
              {chunks.length > 0
                ? chunks.map((c, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: chunks are append-only, index is stable
                    <div key={`re-${i}`} className="border-muted border-b pb-1 mb-1">
                      <span className="text-primary font-bold">{c.kind}</span>
                      {"\n"}
                      {JSON.stringify(c, null, 1)}
                    </div>
                  ))
                : "点击「开始」"}
            </pre>
          </CardContent>
        </Card>

        {/* 右：可视效果 */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs">渲染效果</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="prose prose-sm dark:prose-invert max-h-[28rem] max-w-none overflow-auto rounded p-2">
              {accumulatedText
                ? accumulatedText.split("\n").map((line, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: text lines from split, stable within render
                    <p key={i}>{line || "\u00A0"}</p>
                  ))
                : "点击「开始」"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
