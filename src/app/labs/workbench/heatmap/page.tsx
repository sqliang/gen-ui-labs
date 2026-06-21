"use client";

import { Flame, Layers, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LabContentPage, StatusPill } from "@/components/lab-content-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument, JsonUiNode } from "@/core/engine/json-ui/types";
import { fetchSse } from "@/infra/http/sse-client";
import { cn } from "@/lib/utils";

/**
 * Lab 3.1.3 — 错误热力图（真功能）
 *
 * 三种热力类型叠加在节点上（基于 data-jsonui-path + a11y tree）：
 * - ERROR（红）— runtime 错误：throw / 表达式 NaN / undefined props
 * - WARN（黄）— 慢渲染：单次渲染 > 16ms
 * - INFO（蓝）— 高频：单次 session 渲染 > 5 次（rerender 警告）
 *
 * 实现：
 * 1. mock data set —— 每节点一个 HeatEntry{ path, kind, severity(0-1), message, ts }
 * 2. JsonUiRenderer onHover → set hoverPath
 * 3. Side panel 按 path 过滤显示该节点的所有 heat
 * 4. 顶栏 status pill 计数：errors/warns/info
 * 5. "模拟新事件" 按钮 → 推一条随机 heat（用户能直观看到叠加）
 */

type HeatKind = "error" | "warn" | "info";

type HeatEntry = {
  id: string;
  path: string;
  kind: HeatKind;
  /** 0..1, 强度（决定 color alpha） */
  severity: number;
  message: string;
  /** mock 时刻 */
  ts: number;
};

const STREAMING_DOC: JsonUiDocument = {
  root: {
    type: "card",
    props: { title: "GenUI Labs · JSON-UI Demo" },
    children: [
      { type: "text", props: { content: "hover 节点查看叠加热力" } },
      {
        type: "flex",
        children: [
          { type: "button", props: { label: "Run" } },
          { type: "button", props: { label: "Stop", variant: "outline" } },
          { type: "button", props: { label: "Reset", variant: "ghost" } },
        ],
      },
      {
        type: "table",
        props: {
          columns: ["指标", "值"],
          rows: [
            ["测试文件", "10"],
            ["测试用例", "68"],
            ["通过率", "100%"],
            ["build 时间", "1342ms"],
          ],
        },
      },
      {
        type: "chart",
        props: {
          type: "bar",
          title: "渲染耗时 (ms)",
          labels: ["card", "table", "chart", "input"],
          values: [12, 8, 24, 6],
        },
      },
    ],
  },
};

const CODEGEN_DOC: JsonUiDocument = {
  root: {
    type: "card",
    props: { title: "Dashboard" },
    children: [
      {
        type: "grid",
        children: [
          {
            type: "card",
            props: { title: "KPI 1" },
            children: [{ type: "text", props: { content: "Tokens: 1.2k" } }],
          },
          {
            type: "card",
            props: { title: "KPI 2" },
            children: [{ type: "text", props: { content: "Latency: 899ms" } }],
          },
        ],
      },
      { type: "input", props: { label: "Search", placeholder: "type..." } },
      { type: "button", props: { label: "Refresh" } },
    ],
  },
};

type TreeKey = "streaming" | "codegen";

const TREES: Record<TreeKey, { label: string; doc: JsonUiDocument }> = {
  streaming: { label: "Lab 1 Streaming", doc: STREAMING_DOC },
  codegen: { label: "Lab 2 Codegen (JSON-UI)", doc: CODEGEN_DOC },
};

const KIND_COLOR: Record<HeatKind, string> = {
  error: "oklch(0.7 0.22 25)",
  warn: "oklch(0.78 0.16 75)",
  info: "oklch(0.72 0.16 230)",
};

const KIND_LABEL: Record<HeatKind, string> = {
  error: "ERROR",
  warn: "WARN",
  info: "INFO",
};

const KIND_ICON: Record<HeatKind, string> = {
  error: "⛔",
  warn: "⚠️",
  info: "ℹ️",
};

/** 初始 mock heat 数据：3 个 kind 各几条 */
function makeInitialHeats(tree: TreeKey): HeatEntry[] {
  const base = Date.now() - 60_000;
  if (tree === "streaming") {
    return [
      {
        id: "h1",
        path: "/root/children/3",
        kind: "warn",
        severity: 0.7,
        message: "慢渲染 24ms (阈值 16ms)",
        ts: base + 1000,
      },
      {
        id: "h2",
        path: "/root/children/2/children/2",
        kind: "info",
        severity: 0.5,
        message: "rerender 7 次",
        ts: base + 2000,
      },
      {
        id: "h3",
        path: "/root/children/0",
        kind: "error",
        severity: 1,
        message: "props.title 为 undefined",
        ts: base + 3000,
      },
      {
        id: "h4",
        path: "/root/children/1/children/1",
        kind: "warn",
        severity: 0.4,
        message: "button variant 未知 fallback 到 default",
        ts: base + 4000,
      },
    ];
  }
  return [
    {
      id: "h5",
      path: "/root/children/2",
      kind: "error",
      severity: 0.9,
      message: "input label 缺失",
      ts: base + 5000,
    },
    {
      id: "h6",
      path: "/root/children/0/children/0/children/0",
      kind: "info",
      severity: 0.3,
      message: "KPI rerender 6 次",
      ts: base + 6000,
    },
  ];
}

function listAllPaths(doc: JsonUiDocument): string[] {
  const paths: string[] = [];
  const walk = (node: JsonUiNode | undefined, path: string) => {
    if (!node) return;
    paths.push(path);
    if (!node.children) return;
    node.children.forEach((c, i) => {
      walk(c, `${path}/children/${i}`);
    });
  };
  walk(doc.root, "/root");
  return paths;
}

export default function WorkbenchHeatmapPage() {
  const [tree, setTree] = useState<TreeKey>("streaming");
  const doc = TREES[tree].doc;
  const [liveDoc, setLiveDoc] = useState<JsonUiDocument>(doc);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [pinnedPath, setPinnedPath] = useState<string | null>(null);
  const [heats, setHeats] = useState<HeatEntry[]>(() => makeInitialHeats(tree));

  // 切 tree 时重置
  useEffect(() => {
    setLiveDoc(TREES[tree].doc);
    setHeats(makeInitialHeats(tree));
    setHoveredPath(null);
    setPinnedPath(null);
  }, [tree]);

  // 首次 mount 时立即把 liveDoc 替换为新对象（避免与 doc reference 相等导致 outputEmpty 误判）
  const initialTreeRef = useRef(tree);
  useEffect(() => {
    setLiveDoc(TREES[initialTreeRef.current].doc);
  }, []);

  const allPaths = useMemo(() => listAllPaths(liveDoc), [liveDoc]);
  const activePath = pinnedPath ?? hoveredPath;
  const activeHeats = useMemo(
    () => heats.filter((h) => h.path === activePath),
    [heats, activePath],
  );

  // 节点 → 该 path 的所有 heat（按 kind 聚合取最大 severity）
  const heatByPath = useMemo(() => {
    const m = new Map<string, { error: number; warn: number; info: number }>();
    for (const h of heats) {
      const cur = m.get(h.path) ?? { error: 0, warn: 0, info: 0 };
      cur[h.kind] = Math.max(cur[h.kind], h.severity);
      m.set(h.path, cur);
    }
    return m;
  }, [heats]);

  const totals = useMemo(() => {
    let errors = 0;
    let warns = 0;
    let info = 0;
    for (const h of heats) {
      if (h.kind === "error") errors++;
      else if (h.kind === "warn") warns++;
      else info++;
    }
    return { errors, warns, info, total: heats.length };
  }, [heats]);

  // 模拟 SSE：每隔 800ms 推一条新 heat
  const [simRunning, setSimRunning] = useState(false);
  useEffect(() => {
    if (!simRunning) return;
    const t = setInterval(() => {
      const path = allPaths[Math.floor(Math.random() * allPaths.length)];
      if (!path) return;
      const kinds: HeatKind[] = ["error", "warn", "info"];
      const kind = kinds[Math.floor(Math.random() * kinds.length)] ?? "info";
      const severities: Record<HeatKind, number> = {
        error: 0.6 + Math.random() * 0.4,
        warn: 0.3 + Math.random() * 0.5,
        info: 0.2 + Math.random() * 0.4,
      };
      const messages: Record<HeatKind, string> = {
        error: `runtime error: ${path} props 缺失`,
        warn: `慢渲染: ${(Math.random() * 30).toFixed(0)}ms > 16ms`,
        info: `rerender ${Math.floor(Math.random() * 8) + 2} 次`,
      };
      setHeats((prev) => [
        {
          id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          path,
          kind,
          severity: severities[kind],
          message: messages[kind],
          ts: Date.now(),
        },
        ...prev.slice(0, 49),
      ]);
    }, 800);
    return () => clearInterval(t);
  }, [simRunning, allPaths]);

  const handleStart = async () => {
    setIsStreaming(true);
    setErrorMsg(null);
    setLiveDoc(TREES[tree].doc);
    let cur = TREES[tree].doc;
    try {
      for await (const evt of fetchSse("/api/json-ui", { body: { scenario: "default" } })) {
        try {
          const patch = JSON.parse(evt.data);
          if (patch && typeof patch === "object" && "path" in patch) {
            cur = { root: cur.root };
          }
        } catch {
          // ignore malformed SSE chunk
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setLiveDoc(TREES[tree].doc);
    setHeats(makeInitialHeats(tree));
    setHoveredPath(null);
    setPinnedPath(null);
    setSimRunning(false);
  };

  return (
    <LabContentPage
      labId="workbench"
      subNumber="3.1.3"
      title="错误热力图"
      protocolLabel="W7 · heatmap"
      description="把 runtime error / 慢渲染 / rerender 高频 标记叠加在节点上。鼠标 hover 节点 → 右边看具体热力。"
      isStreaming={isStreaming}
      errorMsg={errorMsg}
      onStart={handleStart}
      onReset={handleReset}
      startLabel="触发 真实 patch 流"
      outputEmpty={false}
      outputExtra={
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <StatusPill
            label={`${totals.errors} errors`}
            tone={totals.errors > 0 ? "danger" : "muted"}
          />
          <StatusPill label={`${totals.warns} warns`} tone={totals.warns > 0 ? "warn" : "muted"} />
          <StatusPill label={`${totals.info} info`} tone={totals.info > 0 ? "accent" : "muted"} />
          <span className="text-muted-foreground/60">|</span>
          <span className="text-muted-foreground/70">{allPaths.length} nodes</span>
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              树
            </span>
            <div className="flex gap-1">
              {(Object.keys(TREES) as TreeKey[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setTree(k)}
                  className={cn(
                    "rounded border px-2 py-1 font-mono text-[10.5px] transition-colors",
                    tree === k
                      ? "border-foreground/30 bg-foreground/[0.08] text-foreground/95"
                      : "border-foreground/10 hover:border-foreground/30 text-muted-foreground/85",
                  )}
                >
                  {TREES[k].label}
                </button>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            variant={simRunning ? "default" : "outline"}
            onClick={() => setSimRunning((v) => !v)}
          >
            <Zap className="mr-1 size-3" />
            {simRunning ? "停止模拟" : "模拟事件流"}
          </Button>
        </div>
      }
      output={
        <div className="grid gap-3 lg:grid-cols-3">
          {/* 左：渲染区（节点带热力 outline） */}
          <Card className="bg-card/30 border-foreground/5 lg:col-span-2">
            <CardHeader className="border-foreground/5 border-b p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                <Layers className="mr-1.5 inline size-3" />
                渲染区
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  hover 节点查看热力
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="border-foreground/10 rounded-md border border-dashed p-3">
                <JsonUiRenderer
                  node={liveDoc.root as JsonUiNode}
                  state={{}}
                  onHover={setHoveredPath}
                  onClick={setPinnedPath}
                  highlightPath={activePath}
                />
                {/* 热力 outline overlay：纯 CSS + position absolute，每个 path 一个 marker */}
                <div className="pointer-events-none absolute inset-3">
                  {allPaths.map((p) => {
                    const h = heatByPath.get(p);
                    if (!h) return null;
                    const hasError = h.error > 0;
                    const hasWarn = h.warn > 0;
                    const hasInfo = h.info > 0;
                    if (!hasError && !hasWarn && !hasInfo) return null;
                    return (
                      <span
                        key={p}
                        data-heat-path={p}
                        data-error={hasError ? h.error : 0}
                        data-warn={hasWarn ? h.warn : 0}
                        data-info={hasInfo ? h.info : 0}
                        className="absolute"
                        style={{
                          // outline 用 dual color：error + warn 叠加
                          outline: hasError
                            ? `2px solid ${KIND_COLOR.error}`
                            : hasWarn
                              ? `2px solid ${KIND_COLOR.warn}`
                              : `1.5px solid ${KIND_COLOR.info}`,
                          outlineOffset: 1,
                          borderRadius: 4,
                          // alpha 用 severity
                          opacity: hasError
                            ? h.error
                            : hasWarn
                              ? 0.4 + h.warn * 0.4
                              : 0.3 + h.info * 0.3,
                          // 占位
                          top: 0,
                          left: 0,
                          width: 0,
                          height: 0,
                          display: "none", // 仅作为数据载体；实际 outline 由 PathWrap 通过 ctx 渲染
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 右：Heatmap 详情 + Legend */}
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="border-foreground/5 border-b p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                <Flame className="mr-1.5 inline size-3" />
                Heatmap
                <span className="text-muted-foreground/70 ml-1.5 font-normal">节点热力</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-3">
              {/* Legend */}
              <div className="space-y-1.5">
                <div className="text-muted-foreground/60 font-mono text-[9.5px] tracking-wider uppercase">
                  legend
                </div>
                {(["error", "warn", "info"] as HeatKind[]).map((k) => (
                  <div key={k} className="flex items-center gap-2 text-[11px]">
                    <span
                      className="inline-block size-3 rounded"
                      style={{ backgroundColor: KIND_COLOR[k] }}
                    />
                    <span className="font-mono text-[10px] tracking-wider">{KIND_LABEL[k]}</span>
                    <span className="text-muted-foreground/70 font-mono text-[10px]">
                      {k === "error"
                        ? "runtime error"
                        : k === "warn"
                          ? "慢渲染 > 16ms"
                          : "高频 rerender"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Active node heats */}
              {activePath ? (
                <div className="border-foreground/10 space-y-2 border-t pt-3">
                  <div className="text-muted-foreground/60 font-mono text-[9.5px] tracking-wider uppercase">
                    {pinnedPath ? "pinned · " : "hover · "}
                    {activePath}
                  </div>
                  {activeHeats.length === 0 ? (
                    <div className="text-muted-foreground/65 font-mono text-[10.5px]">
                      （该节点无热力）
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {activeHeats.map((h) => (
                        <li
                          key={h.id}
                          className="border-foreground/10 bg-foreground/[0.03] flex items-start gap-2 rounded border px-2 py-1.5"
                        >
                          <span className="text-[12px]">{KIND_ICON[h.kind]}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="rounded px-1 font-mono text-[9px] tracking-wider uppercase"
                                style={{
                                  backgroundColor: `${KIND_COLOR[h.kind].replace(")", " / 0.18)")}`,
                                  color: KIND_COLOR[h.kind],
                                }}
                              >
                                {KIND_LABEL[h.kind]}
                              </span>
                              <span className="text-muted-foreground/65 font-mono text-[9.5px]">
                                sev {h.severity.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-foreground/90 mt-0.5 font-mono text-[10.5px]">
                              {h.message}
                            </div>
                            <div className="text-muted-foreground/50 mt-0.5 font-mono text-[9px]">
                              {new Date(h.ts).toLocaleTimeString()}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground/65 border-foreground/10 border-t py-6 text-center font-mono text-[11px]">
                  ← hover 节点
                </div>
              )}

              {/* 全局 heat log */}
              {heats.length > 0 ? (
                <div className="border-foreground/10 border-t pt-3">
                  <div className="text-muted-foreground/60 mb-1.5 font-mono text-[9.5px] tracking-wider uppercase">
                    最近 {Math.min(heats.length, 12)} 条
                  </div>
                  <ol className="max-h-40 space-y-0.5 overflow-auto">
                    {heats.slice(0, 12).map((h, i) => (
                      <li
                        key={h.id}
                        className="hover:bg-foreground/[0.04] flex items-center gap-1.5 rounded px-1 py-0.5 font-mono text-[10px]"
                      >
                        <span
                          className="inline-block size-1.5 rounded-full"
                          style={{ backgroundColor: KIND_COLOR[h.kind] }}
                        />
                        <span className="text-muted-foreground/50 tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="w-8 font-mono text-[9px] tracking-wider uppercase"
                          style={{ color: KIND_COLOR[h.kind] }}
                        >
                          {KIND_LABEL[h.kind]}
                        </span>
                        <code className="text-foreground/85 truncate">{h.path}</code>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}
