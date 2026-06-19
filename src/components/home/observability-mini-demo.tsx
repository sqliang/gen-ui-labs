"use client";

import { useEffect, useState } from "react";

/**
 * Lab 4 · Observability 的 mini-demo。
 *
 * 三个并排的 mini panel：
 * - 左：token 消耗柱状图（input / output / cache）
 * - 中：tool 调用时间线
 * - 右：当前 CoT 推理 step
 */
export function ObservabilityMiniDemo() {
  const steps = [
    "plan · analyze request",
    "plan · decide 3 sub-tasks",
    "act · tool: schema_lookup",
    "act · tool: render_check",
    "observe · diff vs spec",
    "reflect · adjust & retry",
  ] as const;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % steps.length), 1500);
    return () => clearInterval(id);
  }, [steps.length]);

  const inputTokens = 320 + Math.sin(tick) * 40;
  const outputTokens = 180 + Math.cos(tick) * 30;

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex items-center gap-1.5 text-muted-foreground/70">
        <span className="size-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_oklch(0.7_0.18_150)]" />
        observability · live
        <span className="ml-auto">
          step {tick + 1}/{steps.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {/* tokens */}
        <div className="border-emerald-400/20 bg-emerald-400/[0.03] rounded border p-1.5">
          <div className="mb-1 text-muted-foreground/60">tokens</div>
          <div className="space-y-0.5">
            <Bar label="in" value={Math.abs(inputTokens)} max={500} color="emerald" />
            <Bar label="out" value={Math.abs(outputTokens)} max={500} color="emerald" />
          </div>
        </div>

        {/* tools */}
        <div className="border-foreground/10 bg-foreground/[0.03] rounded border p-1.5">
          <div className="mb-1 text-muted-foreground/60">tools</div>
          <div className="space-y-0.5 text-foreground/70">
            {[
              { name: "schema_lookup", ms: 142 },
              { name: "render_check", ms: 87 },
              { name: "diff", ms: 23 },
            ].map((t) => (
              <div key={t.name} className="flex items-center gap-1">
                <span
                  className="size-1 rounded-full"
                  style={{ backgroundColor: `oklch(0.78 0.15 150 / ${0.4 + t.ms / 300})` }}
                />
                <span className="flex-1 truncate text-[9px]">{t.name}</span>
                <span className="text-muted-foreground/60">{t.ms}ms</span>
              </div>
            ))}
          </div>
        </div>

        {/* CoT */}
        <div className="border-foreground/10 bg-foreground/[0.03] rounded border p-1.5">
          <div className="mb-1 text-muted-foreground/60">reasoning</div>
          <div className="space-y-0.5">
            {steps.map((s, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                key={i}
                className={`truncate text-[9px] transition-colors ${
                  i === tick
                    ? "text-emerald-300"
                    : i < tick
                      ? "text-foreground/40 line-through decoration-emerald-400/30"
                      : "text-foreground/60"
                }`}
              >
                {i === tick ? "▸ " : i < tick ? "✓ " : "  "}
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: "emerald";
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1">
      <span className="w-5 text-muted-foreground/60">{label}</span>
      <div className="bg-foreground/10 h-1.5 flex-1 overflow-hidden rounded">
        <div
          className="h-full rounded transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, oklch(0.7 0.18 ${color === "emerald" ? "150" : "230"}), oklch(0.85 0.15 ${color === "emerald" ? "170" : "250"}))`,
          }}
        />
      </div>
      <span className="w-8 text-right text-muted-foreground/70">{Math.round(value)}</span>
    </div>
  );
}
