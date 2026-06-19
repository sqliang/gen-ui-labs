"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hero 右侧的 live token stream —— 模拟"协议事件流 + 文本同步生成"。
 *
 * 这是这个站的灵魂 widget：当你看到它的时候，你就知道这是一个 GenUI 实验站。
 */
const EVENTS = [
  { t: 0, kind: "meta", text: 'protocol="ag-ui" · model="deepseek-chat"' },
  { t: 200, kind: "start", text: "TEXT_MESSAGE_START" },
  { t: 350, kind: "content", text: "Gen" },
  { t: 480, kind: "content", text: "UI" },
  { t: 620, kind: "content", text: " 把" },
  { t: 760, kind: "content", text: " LLM" },
  { t: 900, kind: "tool", text: "TOOL_CALL_START · web_search" },
  { t: 1100, kind: "tool-result", text: "TOOL_CALL_RESULT · 4 hits" },
  { t: 1300, kind: "content", text: " 的" },
  { t: 1450, kind: "content", text: "输出" },
  { t: 1600, kind: "content", text: "流式" },
  { t: 1750, kind: "content", text: "渲染成" },
  { t: 1900, kind: "content", text: "可交互的" },
  { t: 2100, kind: "content", text: "界面" },
  { t: 2300, kind: "delta", text: "STATE_DELTA · tokens=842" },
  { t: 2500, kind: "end", text: "TEXT_MESSAGE_END" },
] as const;

export function LiveTokenStream() {
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const step = () => {
      setTick((t) => {
        const next = (t + 1) % EVENTS.length;
        const dur = (EVENTS[next]?.t ?? 0) - (EVENTS[t]?.t ?? 0);
        timer.current = setTimeout(step, Math.max(120, dur));
        return next;
      });
    };
    timer.current = setTimeout(step, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const visible = EVENTS.slice(0, tick + 1);
  const content = visible
    .filter((e) => e.kind === "content")
    .map((e) => e.text)
    .join("");

  return (
    <div className="border-foreground/10 bg-background/70 relative overflow-hidden rounded-xl border shadow-[0_0_0_1px_oklch(1_0_0/0.04),0_30px_60px_-30px_oklch(0_0_0/0.6)] backdrop-blur-md">
      {/* 顶部 tab */}
      <div className="border-foreground/5 flex items-center gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="bg-foreground/20 size-2 rounded-full" />
          <span className="bg-foreground/20 size-2 rounded-full" />
          <span className="bg-foreground/20 size-2 rounded-full" />
        </div>
        <div className="ml-2 flex items-center gap-2 font-mono text-[10px] text-muted-foreground/70">
          <span className="bg-emerald-400/20 text-emerald-300 rounded px-1.5 py-0.5">● live</span>
          <span>ag-ui stream</span>
        </div>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">
          {visible.length}/{EVENTS.length} events
        </span>
      </div>

      <div className="grid grid-cols-5 gap-0">
        {/* 左：事件流 */}
        <div className="border-foreground/5 col-span-3 border-r">
          <div className="border-foreground/5 text-muted-foreground/60 border-b px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest">
            protocol events
          </div>
          <div className="max-h-[200px] overflow-hidden p-3 font-mono text-[11px] leading-relaxed">
            {visible.map((e, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: streaming buffer
                key={i}
                className="flex items-baseline gap-2"
                style={{
                  color:
                    e.kind === "tool"
                      ? "oklch(0.82 0.16 75)"
                      : e.kind === "tool-result"
                        ? "oklch(0.78 0.15 150)"
                        : e.kind === "delta" || e.kind === "meta"
                          ? "oklch(0.7 0.02 280)"
                          : "oklch(0.78 0.16 230)",
                }}
              >
                <span className="text-muted-foreground/30 w-6 shrink-0 text-right">
                  {String(i).padStart(2, "0")}
                </span>
                <span className="truncate">{e.text}</span>
              </div>
            ))}
            <div className="text-foreground/30 mt-1 flex items-center gap-1 font-mono text-[10px]">
              <span className="inline-block h-3 w-1.5 animate-pulse bg-foreground/60" />
              waiting…
            </div>
          </div>
        </div>

        {/* 右：渲染输出 */}
        <div className="col-span-2">
          <div className="border-foreground/5 text-muted-foreground/60 border-b px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest">
            rendered
          </div>
          <div className="max-h-[200px] p-4">
            <div className="text-foreground/95 text-[15px] leading-relaxed">
              {content}
              <span className="ml-0.5 inline-block h-4 w-[2px] -mb-1 animate-pulse bg-sky-400 align-middle" />
            </div>
            <div className="mt-3 flex items-center gap-2 font-mono text-[10px]">
              <span className="text-muted-foreground/60">streaming</span>
              <span className="bg-foreground/15 h-px flex-1" />
              <span className="text-emerald-400">●</span>
            </div>
            <div className="text-muted-foreground/70 mt-2 font-mono text-[10px]">
              latency · 899ms first token
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
