"use client";

import { useEffect, useState } from "react";

/**
 * Lab 2 · Codegen 的 mini-demo。
 *
 * 模拟"DSL 树"的逐步构造：LLM 一个 chunk 一个 chunk 输出 JSON-UI，
 * 右侧把树状结构"生长"出来。用简单 step 循环，避免真实 LLM 调用。
 */
interface DslStep {
  desc: string;
  rows: string[];
}

const steps: DslStep[] = [
  { desc: "step 1 · root card", rows: [] },
  { desc: "step 2 · add row", rows: ["KPI"] },
  { desc: "step 3 · add chart", rows: ["KPI", "Chart"] },
  { desc: "step 4 · add table", rows: ["KPI", "Chart", "Table"] },
  { desc: "step 5 · done · 4 nodes", rows: ["KPI", "Chart", "Table", "Footer"] },
];

export function CodegenMiniDemo() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % steps.length), 1800);
    return () => clearInterval(id);
  }, []);

  const current = steps[tick % steps.length] ?? steps[0];
  if (!current) return null;
  const rows = current.rows;

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex items-center gap-1.5 text-muted-foreground/70">
        <span className="size-1.5 animate-pulse rounded-full bg-purple-400 shadow-[0_0_6px_oklch(0.7_0.18_290)]" />
        json-ui · dsl
        <span className="ml-auto">{current.desc}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* DSL 源码 */}
        <div className="border-purple-400/20 bg-purple-400/[0.03] rounded border p-2 leading-relaxed">
          <div className="text-muted-foreground/50">{"{"} </div>
          <div className="pl-2">
            <span className="text-foreground/80">Card:</span>{" "}
            <span className="text-muted-foreground">{"{"}</span>
            <div className="pl-2">
              <span className="text-foreground/80">rows:</span> [
              {rows.length === 0 ? (
                <span className="text-muted-foreground/40">…</span>
              ) : (
                rows.map((r, i) => (
                  <span key={r}>
                    <span className="text-purple-300">{`"${r}"`}</span>
                    {i < rows.length - 1 ? ", " : ""}
                  </span>
                ))
              )}
              ]
            </div>
            <span className="text-muted-foreground">{"}"}</span>
          </div>
          <div className="text-muted-foreground/50">{"}"}</div>
        </div>
        {/* 渲染预览 */}
        <div className="border-foreground/10 bg-foreground/[0.03] rounded border p-2">
          <div className="mb-1 text-[10px] font-semibold">Welcome</div>
          <div className="space-y-1">
            {rows.length === 0 ? (
              <div className="text-muted-foreground/40 text-[9px]">…empty</div>
            ) : (
              rows.map((r) => (
                <div
                  key={r}
                  className="border-purple-400/30 bg-purple-400/10 rounded-sm border px-1.5 py-1 text-[9px] text-purple-200"
                >
                  {r}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
