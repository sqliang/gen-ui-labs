"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lab 1 · Streaming Protocols 的 mini-demo。
 *
 * 模拟 SSE 增量输出：左边"协议事件"按 chunk 涌入，右边"渲染输出"对应打字机累积。
 * 不接真实 API，纯前端循环 —— 让卡片有"在跑"的视觉张力。
 */
export function StreamingMiniDemo() {
  const events = [
    "TEXT_MESSAGE_START",
    "TEXT_MESSAGE_CONTENT · '下面'",
    "TEXT_MESSAGE_CONTENT · '我们'",
    "TEXT_MESSAGE_CONTENT · '看看'",
    "TOOL_CALL_START · web_search",
    'TOOL_CALL_ARGS · {"q": "ag-ui"}',
    "TOOL_CALL_RESULT · 8 hits",
    "TEXT_MESSAGE_CONTENT · 'AG-UI 是'",
    "TEXT_MESSAGE_CONTENT · 'CopilotKit'",
    "TEXT_MESSAGE_CONTENT · '提出的'",
    "STATE_DELTA · tokens=842",
    "TEXT_MESSAGE_END",
  ] as const;

  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => setTick((t) => t + 1), 1400);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const visible = events.slice(0, (tick % events.length) + 1);
  const text = visible
    .filter((e) => e.includes("TEXT_MESSAGE_CONTENT"))
    .map((e) => e.split("'")[1] ?? "")
    .join("");

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex items-center gap-1.5 text-muted-foreground/70">
        <span className="size-1.5 animate-pulse rounded-full bg-sky-400 shadow-[0_0_6px_oklch(0.7_0.16_230)]" />
        stream · sse
        <span className="ml-auto">
          {visible.length}/{events.length} events
        </span>
      </div>
      <div className="border-sky-400/20 bg-sky-400/[0.03] max-h-[88px] overflow-hidden rounded border p-2 leading-relaxed">
        {visible.map((e, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: streaming buffer, stable order
            key={i}
            className="truncate opacity-90"
            style={{ color: e.includes("TOOL") ? "oklch(0.78 0.16 75)" : undefined }}
          >
            <span className="text-muted-foreground/50">›</span> {e}
          </div>
        ))}
      </div>
      <div className="border-foreground/10 bg-foreground/[0.03] rounded border p-2 leading-relaxed">
        <span className="text-foreground/85">{text}</span>
        <span className="ml-0.5 inline-block h-3 w-[2px] -mb-0.5 animate-pulse bg-sky-400 align-middle" />
      </div>
    </div>
  );
}
