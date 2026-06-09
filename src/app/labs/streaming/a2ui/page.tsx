"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type A2uiComponentNode, type A2uiEvent, a2uiAdapter } from "@/core/protocols/a2ui/mapper";
import { useStreamingStore } from "@/core/state/streaming-store";
import { fetchSse } from "@/infra/http/sse-client";

export default function A2uiPage() {
  const { chunks, isStreaming, start, append, finish, reset } = useStreamingStore();
  const [rawEvents, setRawEvents] = useState<A2uiEvent[]>([]);
  const [componentTree, setComponentTree] = useState<A2uiComponentNode[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = async () => {
    start("a2ui");
    setErrorMsg(null);
    setRawEvents([]);
    setComponentTree([]);

    try {
      for await (const evt of fetchSse("/api/a2ui", { body: {} })) {
        let a2ui: A2uiEvent;
        try {
          a2ui = JSON.parse(evt.data) as A2uiEvent;
        } catch {
          continue;
        }
        setRawEvents((prev) => [...prev, a2ui]);

        if (a2ui.type === "surfaceUpdate") {
          setComponentTree(a2ui.contents);
        } else if (a2ui.type === "dataModelUpdate") {
          setComponentTree((prev) =>
            prev.map((n) =>
              n.props && a2ui.path.includes(n.id)
                ? { ...n, props: { ...n.props, values: a2ui.value } }
                : n,
            ),
          );
        }

        const re = a2uiAdapter.adapt(a2ui);
        append(re);
        if (a2ui.type === "dismissSurface") break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      finish();
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">1.1.3 A2UI 协议流式</h1>
          <Badge variant="outline">W5 · A2UI v0.2</Badge>
          {isStreaming ? (
            <Badge variant="default" className="font-mono text-[10px]">
              streaming…
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          surfaceUpdate + dataModelUpdate → a2uiAdapter → RenderableEvent → 组件树
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        <Button onClick={handleStart} disabled={isStreaming}>
          {isStreaming ? "流式中…" : "开始 A2UI 流式"}
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
        {/* 左：原始 A2UI 事件 */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs">A2UI 原始事件</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <pre className="bg-muted max-h-[28rem] overflow-auto rounded p-2 font-mono text-[10px] leading-relaxed">
              {rawEvents.length > 0
                ? rawEvents.map((e, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static mock list
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

        {/* 中：组件树 */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs">
              组件树
              <span className="text-muted-foreground ml-1 font-normal">
                ({componentTree.length} 节点)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="max-h-[28rem] overflow-auto rounded">
              {componentTree.length > 0
                ? componentTree.map((node) => (
                    <Card key={node.id} className="mb-2 border-muted">
                      <CardHeader className="p-2">
                        <CardTitle className="text-[11px]">
                          <span className="text-primary font-bold">{node.component}</span>
                          <span className="text-muted-foreground ml-1 font-mono text-[9px]">
                            id:{node.id}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2 pt-0">
                        {node.props ? (
                          <pre className="text-muted-foreground text-[10px]">
                            {JSON.stringify(node.props, null, 2)}
                          </pre>
                        ) : null}
                        {node.children ? (
                          <p className="text-muted-foreground mt-1 text-[10px]">
                            children: [{node.children.join(", ")}]
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))
                : "点击「开始」"}
            </div>
          </CardContent>
        </Card>

        {/* 右：RenderableEvent */}
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
                    // biome-ignore lint/suspicious/noArrayIndexKey: append-only chunks
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
      </div>
    </div>
  );
}
