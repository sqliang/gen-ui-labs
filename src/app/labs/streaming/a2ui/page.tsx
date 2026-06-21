"use client";

import { useState } from "react";

import { LabContentPage } from "@/components/lab-content-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type A2uiComponentNode, type A2uiEvent, a2uiAdapter } from "@/core/protocols/a2ui/mapper";
import { useStreamingStore } from "@/core/state/streaming-store";
import { fetchSse } from "@/infra/http/sse-client";
import { useLabActions } from "@/lib/use-lab-actions";
import { useLogSession } from "@/lib/use-log-session";

function eventKey(e: A2uiEvent, fallback: string): string {
  if (e.type === "dataModelUpdate") {
    return `evt-${e.type}-${e.path}-${fallback}`;
  }
  return `evt-${e.type}-${e.surfaceId}-${fallback}`;
}

function chunkKey(c: import("@/core/protocols/common/types").RenderableEvent, i: number): string {
  if (c.kind === "text") return `chunk-text-${c.path ?? "x"}-${i}`;
  if (c.kind === "component") return `chunk-comp-${c.id}-${i}`;
  if (c.kind === "state") return `chunk-state-${c.path}-${i}`;
  if (c.kind === "tool") return `chunk-tool-${c.name}-${i}`;
  return `chunk-ctrl-${c.type}-${i}`;
}

export default function A2uiPage() {
  const { chunks, isStreaming, start, append, finish, reset } = useStreamingStore();
  const [rawEvents, setRawEvents] = useState<A2uiEvent[]>([]);
  const [componentTree, setComponentTree] = useState<A2uiComponentNode[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = async () => {
    start("a2ui");
    markStart();
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
      logSession();
    }
  };

  // ⌘K action 监听：run / stop / reset
  useLabActions({
    onStart: handleStart,
    onStop: () => finish(),
    onReset: reset,
  });

  // session 完成后写入 sessionsLog
  const { markStart, logSession } = useLogSession({
    lab: "streaming",
    protocol: "A2UI",
    getTitle: () => `A2UI surface · ${componentTree.length} components`,
    getTokens: () => rawEvents.length * 12,
  });

  return (
    <LabContentPage
      labId="streaming"
      subNumber="1.1.3"
      title="A2UI 协议流式"
      protocolLabel="W5 · A2UI v0.2"
      description="A2UI v0.2 用 surfaceUpdate 声明组件树 + dataModelUpdate 增量更新数据 → 通过 a2uiAdapter 转为 RenderableEvent 走统一渲染管道。"
      isStreaming={isStreaming}
      errorMsg={errorMsg}
      onStart={handleStart}
      onReset={reset}
      onStop={() => finish()}
      startLabel="开始 A2UI 流式"
      outputTitle="a2ui · surface inspector"
      outputEmpty={rawEvents.length === 0 && componentTree.length === 0}
      outputEmptyHint={
        <div className="text-muted-foreground/70 py-10 text-center font-mono text-[12px]">
          点击「开始 A2UI 流式」→
          <br />
          下方会出现 surfaceUpdate / dataModelUpdate 流和对应组件树
        </div>
      }
      outputExtra={
        <>
          <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
            {rawEvents.length} events
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
            {componentTree.length} nodes
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
            {chunks.length} chunks
          </span>
        </>
      }
      output={
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                raw a2ui events
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <pre className="bg-[#0d1117] border-foreground/10 max-h-[28rem] overflow-auto rounded-md border p-3 font-mono text-[10px] leading-relaxed text-foreground/85">
                {rawEvents.length > 0
                  ? rawEvents.map((e, i) => (
                      <div
                        key={eventKey(e, String(i))}
                        className="border-foreground/10 border-b pb-1 mb-1 last:border-0"
                      >
                        <span className="font-bold text-emerald-300">{e.type}</span>
                        {"\n"}
                        <span className="text-muted-foreground">{JSON.stringify(e, null, 1)}</span>
                      </div>
                    ))
                  : "点击「开始」"}
              </pre>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                component tree
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  ({componentTree.length} 节点)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="max-h-[28rem] overflow-auto rounded">
                {componentTree.length > 0
                  ? componentTree.map((node) => (
                      <Card key={node.id} className="bg-card/30 border-foreground/10 mb-2">
                        <CardHeader className="p-2">
                          <CardTitle className="text-[11px]">
                            <span className="font-bold text-emerald-300">{node.component}</span>
                            <span className="text-muted-foreground/70 ml-1 font-mono text-[9px]">
                              id:{node.id}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 pt-0">
                          {node.props ? (
                            <pre className="text-muted-foreground/85 font-mono text-[10px]">
                              {JSON.stringify(node.props, null, 2)}
                            </pre>
                          ) : null}
                          {node.children ? (
                            <p className="text-muted-foreground/70 mt-1 font-mono text-[10px]">
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

          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                renderable event
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  ({chunks.length} chunks)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <pre className="bg-[#0d1117] border-foreground/10 max-h-[28rem] overflow-auto rounded-md border p-3 font-mono text-[10px] leading-relaxed text-foreground/85">
                {chunks.length > 0
                  ? chunks.map((c, i) => (
                      <div
                        key={chunkKey(c, i)}
                        className="border-foreground/10 border-b pb-1 mb-1 last:border-0"
                      >
                        <span className="font-bold text-sky-300">{c.kind}</span>
                        {"\n"}
                        <span className="text-muted-foreground">{JSON.stringify(c, null, 1)}</span>
                      </div>
                    ))
                  : "点击「开始」"}
              </pre>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}
