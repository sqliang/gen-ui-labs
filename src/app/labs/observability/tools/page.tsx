"use client";

import { AlertTriangle, Check, Clock, Download, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LabContentPage, StatusPill } from "@/components/lab-content-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AguiEvent, createAguiStatefulAdapter } from "@/core/protocols/ag-ui/mapper";
import { fetchSse } from "@/infra/http/sse-client";
import { cn } from "@/lib/utils";

/**
 * Lab 4.1.2 — 工具调用回放（真功能）
 *
 * 数据流：mock AG-UI event stream（用我们写好的 createAguiStatefulAdapter
 * 合并 START/ARGS/END lifecycle）→ tool call list + waterfall timeline。
 *
 * 每个 tool call 走 lifecycle 三阶段：
 * - START: 记录 toolCallId + name + start_ts
 * - ARGS: 流式拼接 args_delta
 * - END: args 完整 + result + end_ts
 *
 * UI：
 * - 顶部 KPI：总调用 / 进行中 / 完成 / 错误
 * - Tool 卡片列表（每行一个 tool call）：name · status chip · start→end 进度条
 * - 瀑布图：每行一个 gantt，按 time 比例展开
 * - 点击 tool 卡片：右侧显示 raw AG-UI 事件 + 完整 args JSON
 */

type ToolStatus = "running" | "success" | "error";

type ToolCallRow = {
  id: string;
  name: string;
  args: unknown;
  result?: unknown;
  startTs: number;
  argsDoneTs?: number;
  endTs?: number;
  status: ToolStatus;
  errorMsg?: string;
};

const MOCK_EVENTS: AguiEvent[] = [
  // Run 1: 一次成功 tool call
  { type: "TOOL_CALL_START", toolCallId: "tc1", toolCallName: "search" },
  { type: "TOOL_CALL_ARGS", toolCallId: "tc1", delta: '{"q":' },
  { type: "TOOL_CALL_ARGS", toolCallId: "tc1", delta: '"genui labs"}' },
  { type: "TOOL_CALL_END", toolCallId: "tc1", result: { hits: 42 } } as AguiEvent,
  // Run 2: 短 tool call
  { type: "TOOL_CALL_START", toolCallId: "tc2", toolCallName: "fetch_url" },
  { type: "TOOL_CALL_ARGS", toolCallId: "tc2", delta: '{"url":"https://example.com"}' },
  { type: "TOOL_CALL_END", toolCallId: "tc2", result: { status: 200, body: "ok" } } as AguiEvent,
  // Run 3: 错误
  { type: "TOOL_CALL_START", toolCallId: "tc3", toolCallName: "run_sql" },
  { type: "TOOL_CALL_ARGS", toolCallId: "tc3", delta: '{"q":"SELECT * FROM unknown"}' },
  {
    type: "TOOL_CALL_END",
    toolCallId: "tc3",
    error: 'relation "unknown" does not exist',
  },
];

const SCENARIOS = [
  { id: "mock", label: "mock 3 calls" },
  { id: "api", label: "from /api/ag-ui" },
] as const;

type Scenario = (typeof SCENARIOS)[number]["id"];

export default function ToolsPage() {
  const [scenario, setScenario] = useState<Scenario>("mock");
  const [toolCalls, setToolCalls] = useState<Record<string, ToolCallRow>>({});
  const [rawEvents, setRawEvents] = useState<AguiEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const adapterRef = useRef(createAguiStatefulAdapter());

  // 把 adapter 的 onTool 事件转成 React state
  useEffect(() => {
    const adapter = createAguiStatefulAdapter({
      onTool: (tool) => {
        setToolCalls((prev) => {
          const tcid = tool.id ?? `t-${Date.now()}-${Math.random()}`;
          const existing = prev[tcid];
          const startTs = existing?.startTs ?? Date.now();
          const status: ToolStatus = tool.error
            ? "error"
            : tool.result !== undefined
              ? "success"
              : "running";
          const next: ToolCallRow = {
            id: tcid,
            name: tool.name,
            args: tool.args,
            result: tool.result,
            errorMsg: tool.error,
            startTs,
            argsDoneTs:
              tool.args !== undefined && tool.args !== null
                ? (existing?.argsDoneTs ?? Date.now())
                : existing?.argsDoneTs,
            endTs: status !== "running" ? Date.now() : existing?.endTs,
            status,
          };
          return { ...prev, [tcid]: next };
        });
      },
    });
    adapterRef.current = adapter;
  }, []);

  // 模拟 AG-UI SSE 事件流
  const handleStart = async () => {
    setIsStreaming(true);
    setErrorMsg(null);
    setToolCalls({});
    setRawEvents([]);
    setSelectedId(null);
    const adapter = adapterRef.current;
    adapter.reset();
    try {
      if (scenario === "api") {
        for await (const evt of fetchSse("/api/ag-ui", { body: { scenario: "default" } })) {
          try {
            const ev = JSON.parse(evt.data) as AguiEvent;
            setRawEvents((prev) => [...prev, ev]);
            adapter.adapt(ev);
          } catch {
            // ignore
          }
        }
      } else {
        // mock: 每个事件间隔 300ms
        for (const ev of MOCK_EVENTS) {
          await new Promise((r) => setTimeout(r, 300));
          setRawEvents((prev) => [...prev, ev]);
          adapter.adapt(ev);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setToolCalls({});
    setRawEvents([]);
    setSelectedId(null);
    adapterRef.current.reset();
  };

  const handleExportJson = () => {
    const trace = {
      version: 1,
      generatedAt: new Date().toISOString(),
      toolCalls: Object.values(toolCalls).sort((a, b) => a.startTs - b.startTs),
      rawEvents,
    };
    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tool-trace-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = useMemo(
    () => Object.values(toolCalls).sort((a, b) => a.startTs - b.startTs),
    [toolCalls],
  );

  // waterfall 时间范围
  const tStart = rows.length > 0 ? (rows[0]?.startTs ?? 0) : 0;
  const tEnd = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.max(
      ...rows.map((r) => r.endTs ?? (r.status === "running" ? Date.now() : r.startTs)),
    );
  }, [rows]);
  const span = Math.max(1, tEnd - tStart);

  const totals = useMemo(() => {
    let running = 0;
    let success = 0;
    let error = 0;
    for (const r of rows) {
      if (r.status === "running") running++;
      else if (r.status === "success") success++;
      else error++;
    }
    return { total: rows.length, running, success, error };
  }, [rows]);

  const selected = selectedId ? toolCalls[selectedId] : null;

  return (
    <LabContentPage
      labId="observability"
      subNumber="4.1.2"
      title="工具调用回放"
      protocolLabel="W8 · tool lifecycle"
      description="AG-UI TOOL_CALL_START / ARGS / END 完整 lifecycle：args 流式拼接 + 瀑布时延 + 错误高亮。"
      isStreaming={isStreaming}
      errorMsg={errorMsg}
      onStart={handleStart}
      onReset={handleReset}
      startLabel="开始回放"
      outputEmpty={rows.length === 0}
      outputEmptyHint={
        <div className="text-muted-foreground/70 py-10 text-center font-mono text-[12px]">
          选 scenario → 点「开始回放」观察 tool call 生命周期。
        </div>
      }
      outputExtra={
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <StatusPill label={`${totals.total} total`} tone="muted" />
          {totals.running > 0 ? (
            <StatusPill label={`${totals.running} running`} tone="accent" />
          ) : null}
          {totals.success > 0 ? <StatusPill label={`${totals.success} ok`} tone="success" /> : null}
          {totals.error > 0 ? <StatusPill label={`${totals.error} error`} tone="danger" /> : null}
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              scenario
            </span>
            <div className="flex gap-1">
              {SCENARIOS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={cn(
                    "rounded border px-2 py-1 font-mono text-[10.5px] transition-colors",
                    scenario === s.id
                      ? "border-foreground/30 bg-foreground/[0.08] text-foreground/95"
                      : "border-foreground/10 hover:border-foreground/30 text-muted-foreground/85",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={rawEvents.length === 0}
            className="text-muted-foreground/85 hover:text-foreground/95 ml-auto flex items-center gap-1.5 rounded border border-foreground/10 px-2 py-1 font-mono text-[10.5px] transition-colors disabled:opacity-40"
          >
            <Download className="size-3" />
            export trace.json
          </button>
        </div>
      }
      output={
        <div className="grid gap-3 lg:grid-cols-3">
          {/* 左：tool call 列表 + 瀑布 */}
          <div className="space-y-3 lg:col-span-2">
            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="border-foreground/5 border-b p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  <Wrench className="mr-1.5 inline size-3" />
                  Tool Calls · waterfall
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-3">
                {rows.length === 0 ? (
                  <div className="text-muted-foreground/55 py-8 text-center font-mono text-[11px]">
                    等待 tool calls…
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rows.map((r) => {
                      const dur =
                        r.endTs !== undefined ? r.endTs - r.startTs : Date.now() - r.startTs;
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={cn(
                            "block w-full rounded-md border px-3 py-2 text-left transition-colors",
                            selectedId === r.id
                              ? "border-foreground/30 bg-foreground/[0.06]"
                              : "border-foreground/10 hover:border-foreground/20",
                          )}
                        >
                          <div className="mb-1.5 flex items-center gap-2">
                            <ToolStatusChip status={r.status} />
                            <span className="text-foreground/95 font-mono text-[12px] font-medium">
                              {r.name}
                            </span>
                            <code className="text-muted-foreground/65 ml-auto font-mono text-[9.5px]">
                              {r.id}
                            </code>
                            <span className="text-muted-foreground/85 flex items-center gap-0.5 font-mono text-[10px] tabular-nums">
                              <Clock className="size-2.5" />
                              {dur} ms
                            </span>
                          </div>
                          {/* waterfall bar */}
                          <div className="bg-foreground/[0.05] relative h-5 overflow-hidden rounded">
                            {/* start phase */}
                            <div
                              className="absolute inset-y-0 left-0 bg-foreground/15"
                              style={{
                                width: `${(((r.argsDoneTs ?? Date.now()) - r.startTs) / span) * 100}%`,
                              }}
                            />
                            {/* end phase (after args done) */}
                            {r.endTs !== undefined ? (
                              <div
                                className={cn(
                                  "absolute inset-y-0",
                                  r.status === "error" ? "bg-rose-500/30" : "bg-emerald-500/30",
                                )}
                                style={{
                                  left: `${(((r.argsDoneTs ?? r.endTs) - tStart) / span) * 100}%`,
                                  width: `${((r.endTs - (r.argsDoneTs ?? r.endTs)) / span) * 100}%`,
                                }}
                              />
                            ) : null}
                            <div className="absolute inset-0 flex items-center px-1.5 font-mono text-[9px] text-foreground/70">
                              start → args → end
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* raw events 列表 */}
            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="border-foreground/5 border-b p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  Raw AG-UI Events · {rawEvents.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-3">
                <ol className="max-h-40 space-y-0.5 overflow-auto font-mono text-[10.5px]">
                  {rawEvents.map((ev, i) => (
                    <li
                      key={evKey(ev, i)}
                      className="hover:bg-foreground/[0.04] flex items-center gap-1.5 rounded px-1.5 py-0.5"
                    >
                      <span className="text-muted-foreground/50 w-6 text-right tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="rounded px-1 text-[9px] tracking-wider uppercase"
                        style={{
                          color: eventColor(ev),
                          backgroundColor: `${eventColor(ev).replace(")", " / 0.15)")}`,
                        }}
                      >
                        {ev.type.replace("TOOL_CALL_", "T_")}
                      </span>
                      <code className="text-foreground/85 truncate">{summarizeEvent(ev)}</code>
                    </li>
                  ))}
                </ol>
                {rawEvents.length === 0 ? (
                  <div className="text-muted-foreground/55 py-4 text-center font-mono text-[10.5px]">
                    （等待 events）
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* 右：选中 tool 详情 */}
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="border-foreground/5 border-b p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                Inspector
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  {selected ? selected.id : "未选中"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-3">
              {selected ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                      name
                    </div>
                    <code className="bg-foreground/[0.06] block rounded px-2 py-1 font-mono text-[11px]">
                      {selected.name}
                    </code>
                  </div>
                  <div>
                    <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                      status
                    </div>
                    <ToolStatusChip status={selected.status} />
                  </div>
                  <div>
                    <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                      args
                    </div>
                    <pre className="bg-[#0d1117] border-foreground/10 max-h-40 overflow-auto rounded border p-2 font-mono text-[10px] leading-relaxed">
                      {JSON.stringify(selected.args, null, 2)}
                    </pre>
                  </div>
                  {selected.result !== undefined ? (
                    <div>
                      <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                        result
                      </div>
                      <pre className="bg-[#0d1117] border-foreground/10 max-h-40 overflow-auto rounded border p-2 font-mono text-[10px] leading-relaxed">
                        {JSON.stringify(selected.result, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                  {selected.errorMsg ? (
                    <div>
                      <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                        error
                      </div>
                      <pre className="bg-rose-500/10 border-rose-500/20 text-rose-300 max-h-32 overflow-auto rounded border p-2 font-mono text-[10px] leading-relaxed">
                        {selected.errorMsg}
                      </pre>
                    </div>
                  ) : null}
                  <div className="border-foreground/10 grid grid-cols-3 gap-2 border-t pt-3">
                    <div>
                      <div className="text-muted-foreground/60 mb-0.5 font-mono text-[9px] tracking-wider uppercase">
                        start
                      </div>
                      <div className="font-mono text-[10px] tabular-nums">
                        {new Date(selected.startTs).toLocaleTimeString()}
                      </div>
                    </div>
                    {selected.argsDoneTs ? (
                      <div>
                        <div className="text-muted-foreground/60 mb-0.5 font-mono text-[9px] tracking-wider uppercase">
                          args done
                        </div>
                        <div className="font-mono text-[10px] tabular-nums">
                          {new Date(selected.argsDoneTs).toLocaleTimeString()}
                        </div>
                      </div>
                    ) : null}
                    {selected.endTs ? (
                      <div>
                        <div className="text-muted-foreground/60 mb-0.5 font-mono text-[9px] tracking-wider uppercase">
                          end
                        </div>
                        <div className="font-mono text-[10px] tabular-nums">
                          {new Date(selected.endTs).toLocaleTimeString()}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground/65 py-8 text-center font-mono text-[11px]">
                  ← click a tool call
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}

function ToolStatusChip({ status }: { status: ToolStatus }) {
  if (status === "running") {
    return (
      <span className="flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase text-sky-300">
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-sky-400" />
        running
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase text-rose-300">
        <AlertTriangle className="size-2.5" />
        error
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase text-emerald-300">
      <Check className="size-2.5" />
      ok
    </span>
  );
}

function evKey(ev: AguiEvent, i: number): string {
  switch (ev.type) {
    case "TOOL_CALL_START":
      return `start-${ev.toolCallId}-${i}`;
    case "TOOL_CALL_ARGS":
      return `args-${ev.toolCallId}-${i}`;
    case "TOOL_CALL_END":
      return `end-${ev.toolCallId}-${i}`;
    case "STATE_SNAPSHOT":
      return `snap-${i}`;
    case "STATE_DELTA":
      return `delta-${i}`;
    case "TEXT_MESSAGE_CONTENT":
      return `text-${i}`;
    default:
      return `ev-${i}`;
  }
}

function eventColor(ev: AguiEvent): string {
  if (ev.type === "TOOL_CALL_START") return "oklch(0.78 0.16 230)";
  if (ev.type === "TOOL_CALL_ARGS") return "oklch(0.78 0.16 75)";
  if (ev.type === "TOOL_CALL_END") return "oklch(0.7 0.22 30)";
  return "oklch(0.65 0.02 250)";
}

function summarizeEvent(ev: AguiEvent): string {
  switch (ev.type) {
    case "TOOL_CALL_START":
      return `${ev.toolCallId} ${ev.toolCallName}`;
    case "TOOL_CALL_ARGS":
      return `${ev.toolCallId} +${ev.delta.length}b`;
    case "TOOL_CALL_END":
      return ev.error ? `${ev.toolCallId} ERROR: ${ev.error.slice(0, 30)}` : `${ev.toolCallId} ok`;
    case "STATE_SNAPSHOT":
      return `${Object.keys(ev.snapshot).length} keys`;
    case "STATE_DELTA":
      return `${ev.op} ${ev.path}`;
    case "TEXT_MESSAGE_CONTENT":
      return `+${ev.delta.length}b`;
    default:
      return "—";
  }
}
