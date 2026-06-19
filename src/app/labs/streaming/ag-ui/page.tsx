"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  CornerDownRight,
  Cpu,
  Loader2,
  Play,
  Square,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  type AguiEvent,
  type AguiStateDelta,
  type AguiStateSnapshot,
  type AguiToolCallArgs,
  type AguiToolCallEnd,
  type AguiToolCallStart,
  aguiAdapter,
} from "@/core/protocols/ag-ui/mapper";
import { useStreamingStore } from "@/core/state/streaming-store";
import { fetchSse } from "@/infra/http/sse-client";
import { cn } from "@/lib/utils";

// ============================================================
// 协议说明区（静态，让用户 30 秒懂 AG-UI）
// ============================================================

const AGUI_EVENT_TYPES = [
  {
    type: "RUN_STARTED",
    kind: "control",
    label: "Run 开始",
    desc: "标记一次 agent run 启动",
    color: "emerald",
  },
  {
    type: "TEXT_MESSAGE_CONTENT",
    kind: "text",
    label: "文本增量",
    desc: "文本按 delta 流式追加（多次拼接）",
    color: "sky",
  },
  {
    type: "TOOL_CALL_START",
    kind: "tool",
    label: "工具调用开始",
    desc: "声明要调用哪个工具（args 还没到位）",
    color: "amber",
  },
  {
    type: "TOOL_CALL_ARGS",
    kind: "tool",
    label: "工具参数",
    desc: "JSON 片段增量（多次拼接成完整 args）",
    color: "amber",
  },
  {
    type: "TOOL_CALL_END",
    kind: "tool",
    label: "工具调用结束",
    desc: "参数收齐，可以执行工具了",
    color: "amber",
  },
  {
    type: "STATE_SNAPSHOT",
    kind: "state",
    label: "状态快照",
    desc: "整体替换一份 state（不依赖前值）",
    color: "violet",
  },
  {
    type: "STATE_DELTA",
    kind: "state",
    label: "状态增量",
    desc: "JSON-Patch 风格增量更新 state",
    color: "violet",
  },
  {
    type: "RUN_FINISHED",
    kind: "control",
    label: "Run 结束",
    desc: "标记一次 agent run 完成",
    color: "emerald",
  },
  {
    type: "RUN_ERROR",
    kind: "control",
    label: "Run 出错",
    desc: "传输协议错误时上报",
    color: "rose",
  },
] as const;

type AguiEventType = (typeof AGUI_EVENT_TYPES)[number]["type"];

interface Palette {
  dot: string;
  ring: string;
  text: string;
  bg: string;
}

const COLOR_CLASS: Record<string, Palette> = {
  emerald: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/40",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  sky: {
    dot: "bg-sky-500",
    ring: "ring-sky-500/40",
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10",
  },
  amber: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/40",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10",
  },
  violet: {
    dot: "bg-violet-500",
    ring: "ring-violet-500/40",
    text: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-500/10",
  },
  rose: {
    dot: "bg-rose-500",
    ring: "ring-rose-500/40",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10",
  },
};

/** 已知存在的 fallback palette（消除 noUncheckedIndexedAccess 的 undefined） */
const FALLBACK_PALETTE: Palette = COLOR_CLASS.sky ?? {
  dot: "bg-sky-500",
  ring: "ring-sky-500/40",
  text: "text-sky-700 dark:text-sky-300",
  bg: "bg-sky-500/10",
};

function paletteFor(color: string): Palette {
  return COLOR_CLASS[color] ?? FALLBACK_PALETTE;
}

// ============================================================
// 单个事件的时间轴卡片（左栏 + 中栏共用）
// ============================================================

interface TimelineRowProps {
  index: number;
  timestamp: number; // 相对起始的 ms
  eventType: AguiEventType;
  summary: string;
  payload: unknown;
  isLatest: boolean;
}

function TimelineRow({
  index,
  timestamp,
  eventType,
  summary,
  payload,
  isLatest,
}: TimelineRowProps) {
  const meta = AGUI_EVENT_TYPES.find((t) => t.type === eventType);
  const palette = paletteFor(meta?.color ?? "sky");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative pl-8">
      {/* 时间轴竖线 */}
      <div className="bg-border absolute top-0 left-3.5 h-full w-px" aria-hidden />
      {/* 圆点 */}
      <div
        className={cn(
          "border-card absolute top-3 left-2 h-3 w-3 rounded-full border-2 ring-4",
          palette.dot,
          palette.ring,
          isLatest && "animate-pulse",
        )}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "hover:bg-muted/60 group w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-colors",
          expanded && "border-border bg-muted/30",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
            #{String(index + 1).padStart(2, "0")}
          </span>
          <Badge
            variant="outline"
            className={cn("font-mono text-[9px] tracking-tight", palette.text)}
          >
            {eventType}
          </Badge>
          <span className="text-muted-foreground ml-auto font-mono text-[10px] tabular-nums">
            +{timestamp}ms
          </span>
        </div>
        <div className="text-foreground/90 mt-0.5 text-xs">{summary}</div>
        {expanded ? (
          <pre className="bg-card text-muted-foreground mt-2 max-h-40 overflow-auto rounded p-2 font-mono text-[10px] leading-relaxed">
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : null}
      </button>
    </div>
  );
}

// ============================================================
// 事件类型 → 摘要文案（不暴露 JSON 也能讲故事）
// ============================================================

function summarizeEvent(event: AguiEvent, _index: number): string {
  switch (event.type) {
    case "RUN_STARTED":
      return `Thread ${event.threadId} · run ${event.runId} 启动`;
    case "TEXT_MESSAGE_CONTENT": {
      const preview = event.delta.replace(/\n/g, "⏎ ").slice(0, 40);
      return `“${preview}${event.delta.length > 40 ? "…" : ""}”`;
    }
    case "TOOL_CALL_START":
      return `调用工具：${event.toolCallName}（id: ${event.toolCallId}）`;
    case "TOOL_CALL_ARGS": {
      const preview = event.delta.slice(0, 30);
      return `args delta：${preview}${event.delta.length > 30 ? "…" : ""}`;
    }
    case "TOOL_CALL_END":
      return `工具 ${event.toolCallId} 参数收齐`;
    case "STATE_SNAPSHOT":
      return `写入完整 state（${Object.keys(event.snapshot).length} 个 key）`;
    case "STATE_DELTA":
      return `应用 ${event.delta.length} 条 JSON-Patch`;
    case "RUN_FINISHED":
      return `Thread ${event.threadId} · run ${event.runId} 结束`;
    case "RUN_ERROR":
      return event.message;
  }
}

// ============================================================
// 右侧：协议产物（accumulated text + 工具调用卡片 + 流式进度）
// ============================================================

interface ToolCallState {
  id: string;
  name: string;
  args: unknown;
  status: "calling" | "args-done" | "ended";
}

function ToolCallCard({ call }: { call: ToolCallState }) {
  return (
    <div className="border-amber-500/40 bg-amber-500/5 rounded-lg border p-3 text-xs">
      <div className="flex items-center gap-2">
        <Wrench className="text-amber-600 dark:text-amber-400 size-3.5" />
        <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">
          {call.name}
        </span>
        <span className="text-muted-foreground font-mono text-[10px]">id:{call.id}</span>
        <span className="ml-auto">
          {call.status === "calling" ? (
            <Badge
              variant="outline"
              className="font-mono text-[9px] text-amber-700 dark:text-amber-300"
            >
              <Loader2 className="mr-1 size-2.5 animate-spin" /> calling
            </Badge>
          ) : call.status === "args-done" ? (
            <Badge
              variant="outline"
              className="font-mono text-[9px] text-sky-700 dark:text-sky-300"
            >
              <CircleDashed className="mr-1 size-2.5" /> args ✓
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="font-mono text-[9px] text-emerald-700 dark:text-emerald-300"
            >
              <CheckCircle2 className="mr-1 size-2.5" /> ready
            </Badge>
          )}
        </span>
      </div>
      {call.args ? (
        <pre className="bg-card/60 text-muted-foreground mt-2 max-h-24 overflow-auto rounded p-1.5 font-mono text-[10px]">
          {JSON.stringify(call.args, null, 2)}
        </pre>
      ) : (
        <p className="text-muted-foreground mt-2 text-[10px] italic">（args 还没到位…）</p>
      )}
    </div>
  );
}

function StateBanner({ snapshot }: { snapshot: Record<string, unknown> | null }) {
  if (!snapshot) return null;
  return (
    <div className="border-violet-500/40 bg-violet-500/5 rounded-lg border p-3 text-xs">
      <div className="flex items-center gap-2">
        <Cpu className="text-violet-600 dark:text-violet-400 size-3.5" />
        <span className="font-mono text-violet-700 dark:text-violet-300 font-semibold">
          STATE_SNAPSHOT
        </span>
        <span className="text-muted-foreground ml-auto font-mono text-[10px]">
          {Object.keys(snapshot).length} keys
        </span>
      </div>
      <pre className="bg-card/60 text-muted-foreground mt-2 max-h-24 overflow-auto rounded p-1.5 font-mono text-[10px]">
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </div>
  );
}

// ============================================================
// 主页面
// ============================================================

export default function AguiPage() {
  const { chunks, accumulatedText, isStreaming, start, append, finish, reset } =
    useStreamingStore();
  const [rawEvents, setRawEvents] = useState<AguiEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 工具调用状态机：根据事件流派生
  const [toolCalls, setToolCalls] = useState<Record<string, ToolCallState>>({});
  const [stateSnapshot, setStateSnapshot] = useState<Record<string, unknown> | null>(null);

  // 事件时间戳（相对首个事件的 ms）
  const startTimeRef = useRef<number | null>(null);
  const [now, setNow] = useState(0);

  // 跑起来后每秒刷新右下时间
  useEffect(() => {
    if (!isStreaming) return;
    const id = setInterval(() => {
      if (startTimeRef.current !== null) {
        setNow(Math.round(performance.now() - startTimeRef.current));
      }
    }, 100);
    return () => clearInterval(id);
  }, [isStreaming]);

  // 卸载时清理
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // 协议事件分类统计
  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      control: 0,
      text: 0,
      tool: 0,
      state: 0,
    };
    for (const c of chunks) {
      if (c.kind === "text" || c.kind === "tool" || c.kind === "state" || c.kind === "control") {
        counts[c.kind] = (counts[c.kind] ?? 0) + 1;
      }
    }
    return counts;
  }, [chunks]);

  // 当前协议生命周期状态
  const lifecycle = useMemo<"idle" | "running" | "done" | "error">(() => {
    if (isStreaming) return "running";
    if (errorMsg) return "error";
    if (chunks.some((c) => c.kind === "control" && c.type === "end")) return "done";
    return "idle";
  }, [isStreaming, errorMsg, chunks]);

  // 工具调用状态机 reducer
  const updateToolCalls = (event: AguiEvent) => {
    if (event.type === "TOOL_CALL_START") {
      const e = event as AguiToolCallStart;
      setToolCalls((prev) => ({
        ...prev,
        [e.toolCallId]: { id: e.toolCallId, name: e.toolCallName, args: {}, status: "calling" },
      }));
    } else if (event.type === "TOOL_CALL_ARGS") {
      const e = event as AguiToolCallArgs;
      setToolCalls((prev) => {
        const existing = prev[e.toolCallId];
        if (!existing) return prev;
        // 增量 JSON：直接替换（mock 是完整 JSON；真实可能需要合并）
        let parsed: unknown = {};
        try {
          parsed = JSON.parse(e.delta);
        } catch {
          parsed = existing.args;
        }
        return {
          ...prev,
          [e.toolCallId]: { ...existing, args: parsed, status: "args-done" },
        };
      });
    } else if (event.type === "TOOL_CALL_END") {
      const e = event as AguiToolCallEnd;
      setToolCalls((prev) => {
        const existing = prev[e.toolCallId];
        if (!existing) return prev;
        return { ...prev, [e.toolCallId]: { ...existing, status: "ended" } };
      });
    } else if (event.type === "STATE_SNAPSHOT") {
      const e = event as AguiStateSnapshot;
      setStateSnapshot(e.snapshot);
    } else if (event.type === "STATE_DELTA") {
      // 简化：把 delta 转成 JSON 显示（不真做 JSON-Patch）
      const e = event as AguiStateDelta;
      setStateSnapshot((prev) => ({ ...(prev ?? {}), _deltas: e.delta }));
    }
  };

  const handleStart = async () => {
    start("ag-ui");
    setErrorMsg(null);
    setRawEvents([]);
    setToolCalls({});
    setStateSnapshot(null);
    startTimeRef.current = performance.now();
    setNow(0);

    try {
      for await (const evt of fetchSse("/api/ag-ui", { body: {} })) {
        let agui: AguiEvent;
        try {
          agui = JSON.parse(evt.data) as AguiEvent;
        } catch {
          continue;
        }
        setRawEvents((prev) => [...prev, agui]);
        updateToolCalls(agui);

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

  const handleReset = () => {
    reset();
    setRawEvents([]);
    setToolCalls({});
    setStateSnapshot(null);
    setErrorMsg(null);
    startTimeRef.current = null;
    setNow(0);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">1.1.2 AG-UI 协议流式</h1>
          <Badge variant="outline">W4-3 · AG-UI v0.2</Badge>
          <LifecycleBadge state={lifecycle} />
          {isStreaming ? (
            <Badge variant="default" className="font-mono text-[10px]">
              <Loader2 className="mr-1 size-2.5 animate-spin" /> streaming
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          AG-UI 是一套面向 agent 的{" "}
          <span className="text-foreground font-medium">结构化事件流协议</span>
          。与 Markdown 协议不同：AG-UI 用 <code className="text-foreground">typed events</code>{" "}
          区分文本、工具调用、状态更新，渲染层按 event type 分发到不同 UI 组件。
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={handleStart} disabled={isStreaming}>
          <Play className="size-3.5" /> {isStreaming ? "流式中…" : "开始 AG-UI 流式"}
        </Button>
        <Button onClick={handleStop} variant="outline" disabled={!isStreaming}>
          <Square className="size-3.5" /> 停止
        </Button>
        <Button onClick={handleReset} variant="ghost" disabled={isStreaming}>
          清空
        </Button>
        <span className="text-muted-foreground ml-auto self-center font-mono text-[10px]">
          {chunks.length} chunks · {now}ms
        </span>
      </div>

      {errorMsg ? (
        <Card className="border-destructive/50 bg-destructive/5 mb-4">
          <CardContent className="p-3 text-destructive flex items-center gap-2 text-sm">
            <XCircle className="size-4" />
            <strong>错误：</strong>
            {errorMsg}
          </CardContent>
        </Card>
      ) : null}

      {/* === 协议流转图（用户一眼懂 AG-UI 是怎么流的） === */}
      <Card className="mb-4">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">AG-UI 事件流 · 一条消息的生命周期</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            <FlowChip color="emerald" label="RUN_STARTED" />
            <ArrowRight className="text-muted-foreground size-3.5" />
            <FlowChip color="sky" label="TEXT_MESSAGE_CONTENT" small="×n" />
            <ArrowRight className="text-muted-foreground size-3.5" />
            <FlowChip color="amber" label="TOOL_CALL_START" />
            <ArrowRight className="text-muted-foreground size-3.5" />
            <FlowChip color="amber" label="TOOL_CALL_ARGS" small="×n" />
            <ArrowRight className="text-muted-foreground size-3.5" />
            <FlowChip color="amber" label="TOOL_CALL_END" />
            <ArrowRight className="text-muted-foreground size-3.5" />
            <FlowChip color="sky" label="TEXT_MESSAGE_CONTENT" small="×n" />
            <ArrowRight className="text-muted-foreground size-3.5" />
            <FlowChip color="emerald" label="RUN_FINISHED" />
          </div>
          <p className="text-muted-foreground mt-2 text-[11px]">
            ↓ 这一组事件流正在本页右下角实时跑 · 点击「开始 AG-UI 流式」观察每个事件单独到达 →
          </p>
        </CardContent>
      </Card>

      {/* === 三栏主视图 === */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ──── 左栏：事件类型字典（AG-UI 协议全貌） ──── */}
        <Card className="lg:col-span-3">
          <CardHeader className="p-3">
            <CardTitle className="text-xs">
              AG-UI 事件类型
              <span className="text-muted-foreground ml-1 font-normal">(9 种 / 4 类)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ul className="space-y-2">
              {AGUI_EVENT_TYPES.map((t) => {
                const palette = paletteFor(t.color);
                return (
                  <li key={t.type} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full ring-2",
                        palette.dot,
                        palette.ring,
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <code className={cn("font-mono text-[10px] font-bold", palette.text)}>
                          {t.type}
                        </code>
                        <span className="text-muted-foreground text-[10px]">· {t.kind}</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-[10.5px] leading-snug">
                        {t.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* ──── 中栏：时间轴 · 真实事件流 ──── */}
        <Card className="lg:col-span-5">
          <CardHeader className="p-3">
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-xs">原始事件流（按到达顺序）</CardTitle>
              <span className="text-muted-foreground font-mono text-[10px]">
                {rawEvents.length} / 9
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {rawEvents.length === 0 ? (
              <EmptyHint>
                点击「开始 AG-UI 流式」→
                <br />
                这里会出现 9 个事件的时间轴。
              </EmptyHint>
            ) : (
              <div className="max-h-[36rem] space-y-1 overflow-auto pr-1 scrollbar-thin">
                {rawEvents.map((evt, i) => {
                  const ts = i * 200;
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: rawEvents is append-only, idx is stable
                      key={`evt-${evt.type}-${i}`}
                    >
                      <TimelineRow
                        index={i}
                        timestamp={ts}
                        eventType={evt.type as AguiEventType}
                        summary={summarizeEvent(evt, i)}
                        payload={evt}
                        isLatest={i === rawEvents.length - 1}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ──── 右栏：渲染产物（accumulated text + 工具卡 + 进度） ──── */}
        <Card className="lg:col-span-4">
          <CardHeader className="p-3">
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-xs">渲染产物（适配器输出）</CardTitle>
              <span className="text-muted-foreground font-mono text-[10px]">
                {chunks.length} RenderableEvent
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {chunks.length === 0 ? (
              <EmptyHint>点击「开始」观察右栏实时填充。</EmptyHint>
            ) : (
              <div className="space-y-3">
                {/* 文本内容 */}
                {accumulatedText ? (
                  <div className="border-border bg-card rounded-lg border p-3">
                    <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10px] font-mono">
                      <CornerDownRight className="size-3" />
                      TextChunk · {accumulatedText.length} chars
                      {isStreaming ? (
                        <span className="bg-primary ml-1 inline-block h-3 w-1.5 animate-pulse" />
                      ) : null}
                    </div>
                    <p className="text-foreground/90 whitespace-pre-wrap text-xs leading-relaxed">
                      {accumulatedText}
                    </p>
                  </div>
                ) : null}

                {/* 工具调用卡片 */}
                {Object.values(toolCalls).map((c) => (
                  <ToolCallCard key={c.id} call={c} />
                ))}

                {/* 状态快照 */}
                {stateSnapshot ? <StateBanner snapshot={stateSnapshot} /> : null}

                <Separator />

                {/* 流式进度 */}
                <div className="space-y-2">
                  <div className="text-muted-foreground text-[10px] font-mono">
                    Event kinds · {chunks.length} total
                  </div>
                  <KindBar stats={stats} total={chunks.length} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === 底部：协议说明 + adapter 流转图 === */}
      <Card className="mt-4">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">为什么用 AG-UI？与 Markdown 协议的区别</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
            <CompareRow
              aspect="事件粒度"
              markdown="每 N 字符一个 text chunk"
              agui="typed event：text / tool / state / control"
            />
            <CompareRow
              aspect="工具调用"
              markdown="需要自己用 markdown 解析（如 ```json```）"
              agui="TOOL_CALL_START / ARGS / END 显式生命周期"
            />
            <CompareRow
              aspect="状态表达"
              markdown="无（一股脑是文本）"
              agui="STATE_SNAPSHOT / STATE_DELTA 可独立更新 UI"
            />
            <CompareRow
              aspect="渲染策略"
              markdown="整个文本框 re-render"
              agui="按 event type 分发到不同组件"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 小组件
// ============================================================

function FlowChip({ color, label, small }: { color: string; label: string; small?: string }) {
  const palette = paletteFor(color);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono",
        palette.text,
        palette.bg,
        "border-current/30",
      )}
    >
      <span className={cn("size-1.5 rounded-full", palette.dot)} />
      {label}
      {small ? <span className="opacity-60">{small}</span> : null}
    </span>
  );
}

function LifecycleBadge({ state }: { state: "idle" | "running" | "done" | "error" }) {
  const map = {
    idle: { icon: CircleDashed, label: "idle", color: "text-muted-foreground" },
    running: { icon: Loader2, label: "running", color: "text-sky-600 dark:text-sky-400" },
    done: { icon: CheckCircle2, label: "done", color: "text-emerald-600 dark:text-emerald-400" },
    error: { icon: XCircle, label: "error", color: "text-rose-600 dark:text-rose-400" },
  } as const;
  const m = map[state];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px]", m.color)}>
      <Icon className={cn("mr-1 size-2.5", state === "running" && "animate-spin")} />
      {m.label}
    </Badge>
  );
}

function KindBar({ stats, total }: { stats: Record<string, number>; total: number }) {
  const segs: { kind: string; count: number; color: string }[] = [
    { kind: "text", count: stats.text ?? 0, color: "bg-sky-500" },
    { kind: "tool", count: stats.tool ?? 0, color: "bg-amber-500" },
    { kind: "state", count: stats.state ?? 0, color: "bg-violet-500" },
    { kind: "control", count: stats.control ?? 0, color: "bg-emerald-500" },
  ];
  return (
    <div>
      <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
        {segs.map((s) =>
          s.count > 0 ? (
            <div
              key={s.kind}
              className={cn("h-full transition-all", s.color)}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${s.kind}: ${s.count}`}
            />
          ) : null,
        )}
      </div>
      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[10px]">
        {segs.map((s) => (
          <span key={s.kind} className="flex items-center gap-1">
            <span className={cn("size-1.5 rounded-full", s.color)} />
            {s.kind} {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompareRow({
  aspect,
  markdown,
  agui,
}: {
  aspect: string;
  markdown: string;
  agui: string;
}) {
  return (
    <div className="border-border rounded-lg border p-3">
      <div className="text-foreground mb-1.5 text-[11px] font-semibold">{aspect}</div>
      <div className="space-y-1 text-[11px]">
        <div className="flex gap-1.5">
          <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px]">
            MD
          </span>
          <span className="text-muted-foreground">{markdown}</span>
        </div>
        <div className="flex gap-1.5">
          <span className="bg-sky-500/10 text-sky-700 dark:text-sky-300 shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px]">
            AG-UI
          </span>
          <span className="text-foreground/90">{agui}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground flex h-40 items-center justify-center text-center text-xs">
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
