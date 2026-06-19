"use client";

import { useEffect, useState } from "react";

/**
 * Lab 3 · Workbench 的 mini-demo。
 *
 * 三栏：左 DSL / 中 events / 右 rendered。点击左栏某一行，对应右栏高亮。
 * 不做真实节点 inspector，只演示"反向高亮"概念。
 */
const LINES = [
  "Card {",
  "  title: 'Metrics'",
  "  row: [",
  "    KPI { value: 42 }",
  "    KPI { value: 17 }",
  "    Chart { type: 'bar' }",
  "  ]",
  "}",
] as const;

export function WorkbenchMiniDemo() {
  const [hoverLine, setHoverLine] = useState(3);

  useEffect(() => {
    const id = setInterval(() => {
      setHoverLine((t) => (t + 1) % LINES.length);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex items-center gap-1.5 text-muted-foreground/70">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-400 shadow-[0_0_6px_oklch(0.78_0.16_75)]" />
        inspector · hover-sync
        <span className="ml-auto">
          line {hoverLine + 1}/{LINES.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {/* DSL */}
        <div className="border-amber-400/20 bg-amber-400/[0.03] rounded border p-1.5 leading-relaxed">
          {LINES.map((ln, i) => (
            <button
              type="button"
              // biome-ignore lint/suspicious/noArrayIndexKey: static demo
              key={i}
              onMouseEnter={() => setHoverLine(i)}
              onFocus={() => setHoverLine(i)}
              className={`-mx-1.5 block w-[calc(100%+0.75rem)] cursor-default border-0 bg-transparent px-1.5 text-left transition-colors ${
                hoverLine === i ? "bg-amber-400/20 text-amber-100" : "text-foreground/70"
              }`}
            >
              <span className="mr-1 text-muted-foreground/40">{i + 1}</span>
              {ln}
            </button>
          ))}
        </div>
        {/* Events */}
        <div className="border-foreground/10 bg-foreground/[0.03] rounded border p-1.5 leading-relaxed">
          <div className="text-muted-foreground/60">events</div>
          <div className="mt-1 space-y-0.5 text-foreground/70">
            <div>node.mount</div>
            <div className={hoverLine === 3 ? "text-amber-300" : ""}>node.mount · KPI</div>
            <div className={hoverLine === 4 ? "text-amber-300" : ""}>node.mount · KPI</div>
            <div className={hoverLine === 5 ? "text-amber-300" : ""}>node.mount · Chart</div>
          </div>
        </div>
        {/* Rendered */}
        <div className="border-foreground/10 bg-foreground/[0.03] rounded border p-1.5">
          <div className="mb-1 text-[10px] font-semibold text-foreground/85">Metrics</div>
          <div className="space-y-0.5">
            {(["42", "17", "📊"] as const).map((v, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static demo
                key={i}
                className={`rounded-sm border px-1 py-0.5 text-[9px] transition-all ${
                  hoverLine === i + 3
                    ? "border-amber-400/60 bg-amber-400/15 text-amber-100 shadow-[0_0_0_1px_oklch(0.78_0.16_75/0.4)]"
                    : "border-foreground/10 bg-foreground/5 text-foreground/70"
                }`}
              >
                KPI · {v}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
