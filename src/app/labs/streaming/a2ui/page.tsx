"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { LabContentPage } from "@/components/lab-content-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type A2uiComponentNode,
  type A2uiEvent,
  createA2uiStatefulAdapter,
} from "@/core/protocols/a2ui/mapper";
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
  const [surfaces, setSurfaces] = useState<Map<string, A2uiComponentNode[]>>(new Map());
  const [activeSurface, setActiveSurface] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 协议 stateful adapter（增量 mount/patch + 多 surface 维护）
  const adapterRef = useRef(createA2uiStatefulAdapter());

  const handleStart = async () => {
    start("a2ui");
    markStart();
    setErrorMsg(null);
    setRawEvents([]);
    setComponentTree([]);
    setSurfaces(new Map());
    setActiveSurface(null);
    adapterRef.current.reset();

    try {
      for await (const evt of fetchSse("/api/a2ui", { body: {} })) {
        let a2ui: A2uiEvent;
        try {
          a2ui = JSON.parse(evt.data) as A2uiEvent;
        } catch {
          continue;
        }
        setRawEvents((prev) => [...prev, a2ui]);

        const re = adapterRef.current.adapt(a2ui);
        // 用 snapshot 拿当前所有 surface → 同步到 surfaces map
        const snap = adapterRef.current.snapshot();
        const nextSurfaces = new Map<string, A2uiComponentNode[]>();
        for (const [id, surface] of snap) {
          nextSurfaces.set(id, Array.from(surface.components.values()));
        }
        setSurfaces(nextSurfaces);
        // 如果还没选 active，选第一个；已选则保留
        setActiveSurface((prev) => {
          if (prev && nextSurfaces.has(prev)) return prev;
          return nextSurfaces.keys().next().value ?? null;
        });
        // 同步 componentTree 到当前 active
        const surfaceId =
          a2ui.type === "surfaceUpdate" || a2ui.type === "dataModelUpdate" ? a2ui.surfaceId : null;
        if (surfaceId && nextSurfaces.has(surfaceId)) {
          setComponentTree(nextSurfaces.get(surfaceId) ?? []);
        } else {
          // fallback: 第一个 surface
          const first = nextSurfaces.values().next().value ?? [];
          setComponentTree(first);
        }
        for (const e of re) {
          append(e);
        }
        if (a2ui.type === "dismissSurface") {
          // dismiss 后从 map 删（snapshot 已自动删），但要清空 active 如果是它
          if (surfaceId === activeSurface) setActiveSurface(null);
        }
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

  // ===== Surface 编排（手动 add / delete / switch）=====
  // provider 也可推 add/remove surface（流式自动）—— 这里 UI 让用户在 idle 时手动编排。
  const handleAddSurface = () => {
    let id = "";
    for (let i = surfaces.size; i < 100; i++) {
      const candidate = `surface_${i}`;
      if (!surfaces.has(candidate)) {
        id = candidate;
        break;
      }
    }
    if (!id) return;
    const next = new Map(surfaces);
    next.set(id, []);
    setSurfaces(next);
    setActiveSurface(id);
    setComponentTree([]);
  };

  const handleDeleteSurface = (id: string) => {
    if (!surfaces.has(id)) return;
    const next = new Map(surfaces);
    next.delete(id);
    setSurfaces(next);
    if (activeSurface === id) {
      setActiveSurface(null);
      setComponentTree([]);
    }
  };

  const handleClearAllSurfaces = () => {
    setSurfaces(new Map());
    setActiveSurface(null);
    setComponentTree([]);
  };

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
            {surfaces.size} surfaces
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
      toolbar={
        surfaces.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              surface
            </span>
            <div className="flex flex-wrap gap-1">
              {Array.from(surfaces.keys()).map((id) => (
                <div key={id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSurface(id);
                      setComponentTree(surfaces.get(id) ?? []);
                    }}
                    className={
                      activeSurface === id
                        ? "rounded-l border border-r-0 border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-300"
                        : "rounded-l border border-r-0 border-foreground/10 px-2 py-0.5 font-mono text-[10px] text-muted-foreground/85 hover:border-foreground/30"
                    }
                  >
                    {id}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSurface(id)}
                    aria-label={`Delete ${id}`}
                    className={
                      activeSurface === id
                        ? "rounded-r border border-l-0 border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-sky-300/70 hover:bg-rose-500/15 hover:text-rose-300"
                        : "rounded-r border border-l-0 border-foreground/10 px-1.5 py-0.5 text-muted-foreground/60 hover:bg-rose-500/15 hover:text-rose-300"
                    }
                  >
                    <Trash2 className="size-2.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddSurface}
                aria-label="Add surface"
                className="flex items-center gap-1 rounded border border-foreground/10 px-2 py-0.5 font-mono text-[10px] text-muted-foreground/85 hover:border-foreground/30 hover:text-foreground"
              >
                <Plus className="size-2.5" />
                add
              </button>
              {surfaces.size > 1 && (
                <button
                  type="button"
                  onClick={handleClearAllSurfaces}
                  className="rounded border border-foreground/10 px-2 py-0.5 font-mono text-[10px] text-muted-foreground/70 hover:border-rose-500/40 hover:text-rose-300"
                >
                  clear all
                </button>
              )}
            </div>
          </div>
        ) : null
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
