"use client";

import { Coins, Download, Sparkles, Timer, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LabContentPage, StatusPill } from "@/components/lab-content-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILTIN_MODELS } from "@/core/models/registry";
import type { ModelInfo } from "@/core/models/types";
import { cn } from "@/lib/utils";

/**
 * Lab 4.1.1 — Token 成本面板（真功能）
 *
 * 数据源：mock streaming sessions（前端 setInterval 模拟）。
 * 每个 session 模拟一次 LLM 调用，产出：
 * - prompt_tokens / completion_tokens
 * - TTFT（首 token 延迟）
 * - model
 * - timestamp
 *
 * UI：
 * - 4 个 KPI 卡：总 prompt / 总 completion / 总成本 / 平均 TTFT
 * - 折线图：每模型 TTFT 滚动时间线（最近 30 个 session，按 model 分色）
 * - 折线图：每模型 cumulative cost 滚动
 * - 模型表：13 个 model × cost 列
 *
 * 成本 = prompt/1M × cost_in + completion/1M × cost_out
 */

type Session = {
  id: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  ttftMs: number;
  totalMs: number;
  ts: number;
};

const MODEL_COLORS: Record<string, string> = {
  openai: "oklch(0.78 0.16 230)",
  anthropic: "oklch(0.7 0.22 30)",
  google: "oklch(0.78 0.16 145)",
  deepseek: "oklch(0.72 0.16 300)",
  qwen: "oklch(0.78 0.16 75)",
  ollama: "oklch(0.65 0.02 250)",
};

function colorFor(modelId: string): string {
  const m = BUILTIN_MODELS.find((x) => x.id === modelId);
  if (!m) return "oklch(0.65 0.02 250)";
  return MODEL_COLORS[m.provider] ?? "oklch(0.65 0.02 250)";
}

function modelFor(id: string): ModelInfo | undefined {
  return BUILTIN_MODELS.find((m) => m.id === id);
}

function sessionCost(s: Session): number {
  const m = modelFor(s.model);
  if (!m) return 0;
  const inCost = m.costPerMillionInput ?? 0;
  const outCost = m.costPerMillionOutput ?? 0;
  return (s.promptTokens / 1_000_000) * inCost + (s.completionTokens / 1_000_000) * outCost;
}

const SESSION_CAP = 60;

export default function TokensPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const idRef = useRef(0);
  const isStreamingRef = useRef(false);
  isStreamingRef.current = isStreaming;

  // 模拟 streaming session
  useEffect(() => {
    const t = setInterval(() => {
      if (!isStreamingRef.current) return;
      const model = BUILTIN_MODELS[Math.floor(Math.random() * BUILTIN_MODELS.length)];
      if (!model) return;
      const s: Session = {
        id: idRef.current++,
        model: model.id,
        promptTokens: 200 + Math.floor(Math.random() * 1800),
        completionTokens: 100 + Math.floor(Math.random() * 2400),
        ttftMs: 200 + Math.floor(Math.random() * 1200),
        totalMs: 1500 + Math.floor(Math.random() * 4000),
        ts: Date.now(),
      };
      setSessions((prev) => {
        const next = [...prev, s];
        return next.length > SESSION_CAP ? next.slice(-SESSION_CAP) : next;
      });
    }, 1200 / speed);
    return () => clearInterval(t);
  }, [speed]);

  const handleStart = () => {
    setErrorMsg(null);
    setIsStreaming(true);
  };

  const handleReset = () => {
    setIsStreaming(false);
    setSessions([]);
  };

  const handleExportCsv = () => {
    const header = "model,provider,calls,prompt_tokens,completion_tokens,cost_usd,avg_ttft_ms\n";
    const rows = Array.from(byModel.entries())
      .map(([id, agg]) => {
        const m = BUILTIN_MODELS.find((x) => x.id === id);
        const provider = m?.provider ?? "?";
        const calls = agg.count;
        const prompt = agg.prompt;
        const completion = agg.completion;
        const cost = agg.cost;
        const ttft = calls > 0 ? Math.round(agg.ttftSum / calls) : 0;
        return [id, provider, calls, prompt, completion, cost.toFixed(6), ttft].join(",");
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tokens-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 聚合：按 model
  const byModel = useMemo(() => {
    const m = new Map<
      string,
      { prompt: number; completion: number; cost: number; ttftSum: number; count: number }
    >();
    for (const s of sessions) {
      const cur = m.get(s.model) ?? { prompt: 0, completion: 0, cost: 0, ttftSum: 0, count: 0 };
      cur.prompt += s.promptTokens;
      cur.completion += s.completionTokens;
      cur.cost += sessionCost(s);
      cur.ttftSum += s.ttftMs;
      cur.count += 1;
      m.set(s.model, cur);
    }
    return m;
  }, [sessions]);

  // 全局 KPI
  const totals = useMemo(() => {
    let prompt = 0;
    let completion = 0;
    let cost = 0;
    let ttftSum = 0;
    for (const s of sessions) {
      prompt += s.promptTokens;
      completion += s.completionTokens;
      cost += sessionCost(s);
      ttftSum += s.ttftMs;
    }
    return {
      prompt,
      completion,
      cost,
      avgTtft: sessions.length > 0 ? ttftSum / sessions.length : 0,
      count: sessions.length,
    };
  }, [sessions]);

  // TTFT 滚动时间线（最近 30 个 session，按 model 分 path）
  const ttftChart = useMemo(() => {
    const data = sessions.slice(-30);
    const maxTtft = Math.max(500, ...data.map((s) => s.ttftMs));
    return { data, maxTtft };
  }, [sessions]);

  // Cost 累积图（按时间累加）
  const costChart = useMemo(() => {
    let acc = 0;
    return sessions.slice(-30).map((s) => {
      acc += sessionCost(s);
      return { ...s, cumulative: acc };
    });
  }, [sessions]);

  return (
    <LabContentPage
      labId="observability"
      subNumber="4.1.1"
      title="Token 成本面板"
      protocolLabel="W8 · tokens · cost"
      description="实时按模型统计 prompt / completion token、首 token 延迟 (TTFT)、成本估算 (USD)。"
      isStreaming={isStreaming}
      errorMsg={errorMsg}
      onStart={handleStart}
      onReset={handleReset}
      startLabel="开始模拟"
      outputEmpty={sessions.length === 0}
      outputEmptyHint={
        <div className="text-muted-foreground/70 py-10 text-center font-mono text-[12px]">
          点「开始模拟」观察 token 累积。
        </div>
      }
      outputExtra={
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <StatusPill label={`${totals.count} calls`} tone="muted" />
          {isStreaming ? <StatusPill label="● live" tone="success" /> : null}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sessions.length === 0}
            className="text-muted-foreground/85 hover:text-foreground/95 ml-2 flex items-center gap-1.5 rounded border border-foreground/10 px-2 py-0.5 font-mono text-[10px] transition-colors disabled:opacity-40"
          >
            <Download className="size-3" />
            export .csv
          </button>
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              speed
            </span>
            <div className="flex gap-1">
              {([0.5, 1, 2] as const).map((sp) => (
                <button
                  type="button"
                  key={sp}
                  onClick={() => setSpeed(sp)}
                  className={cn(
                    "rounded border px-2 py-1 font-mono text-[10.5px] transition-colors",
                    speed === sp
                      ? "border-foreground/30 bg-foreground/[0.08] text-foreground/95"
                      : "border-foreground/10 hover:border-foreground/30 text-muted-foreground/85",
                  )}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>
        </div>
      }
      output={
        <div className="space-y-3">
          {/* KPI 4-card */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Kpi
              icon={<Coins className="size-3" />}
              label="prompt tokens"
              value={totals.prompt.toLocaleString()}
              accent="oklch(0.78 0.16 230)"
            />
            <Kpi
              icon={<Sparkles className="size-3" />}
              label="completion tokens"
              value={totals.completion.toLocaleString()}
              accent="oklch(0.78 0.16 145)"
            />
            <Kpi
              icon={<Wallet className="size-3" />}
              label="cost (USD)"
              value={`$${totals.cost.toFixed(4)}`}
              accent="oklch(0.78 0.16 75)"
            />
            <Kpi
              icon={<Timer className="size-3" />}
              label="avg TTFT"
              value={`${Math.round(totals.avgTtft)} ms`}
              accent="oklch(0.7 0.22 30)"
            />
          </div>

          {/* Charts 双栏 */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="border-foreground/5 border-b p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  <Timer className="mr-1.5 inline size-3" />
                  TTFT 时间线
                  <span className="text-muted-foreground/70 ml-1.5 font-normal">
                    最近 {ttftChart.data.length} 次
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-3">
                <TTFTChart sessions={ttftChart.data} maxTtft={ttftChart.maxTtft} />
              </CardContent>
            </Card>

            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="border-foreground/5 border-b p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  <Wallet className="mr-1.5 inline size-3" />
                  累积成本
                  <span className="text-muted-foreground/70 ml-1.5 font-normal">
                    ${totals.cost.toFixed(4)} total
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-3">
                <CostChart sessions={costChart} />
              </CardContent>
            </Card>
          </div>

          {/* 模型表 */}
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="border-foreground/5 border-b p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                模型成本表
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  {byModel.size} 个模型在用 · {totals.count} calls
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-3">
              {byModel.size === 0 ? (
                <div className="text-muted-foreground/60 py-6 text-center font-mono text-[11px]">
                  还没有 session
                </div>
              ) : (
                <table className="w-full font-mono text-[10.5px]">
                  <thead>
                    <tr className="text-muted-foreground/70 text-[9.5px] tracking-wider uppercase">
                      <th className="px-2 py-1.5 text-left">model</th>
                      <th className="px-2 py-1.5 text-right">calls</th>
                      <th className="px-2 py-1.5 text-right">prompt</th>
                      <th className="px-2 py-1.5 text-right">completion</th>
                      <th className="px-2 py-1.5 text-right">avg TTFT</th>
                      <th className="px-2 py-1.5 text-right">cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...byModel.entries()]
                      .sort((a, b) => b[1].cost - a[1].cost)
                      .map(([modelId, agg]) => {
                        const m = modelFor(modelId);
                        return (
                          <tr
                            key={modelId}
                            className="hover:bg-foreground/[0.04] border-foreground/5 border-t"
                          >
                            <td className="flex items-center gap-2 px-2 py-1.5">
                              <span
                                className="inline-block size-2 rounded-full"
                                style={{ backgroundColor: colorFor(modelId) }}
                              />
                              <span className="text-foreground/90">{modelId}</span>
                              {m?.provider ? (
                                <span className="text-muted-foreground/60 text-[9px]">
                                  {m.provider}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{agg.count}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {agg.prompt.toLocaleString()}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {agg.completion.toLocaleString()}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {Math.round(agg.ttftSum / agg.count)} ms
                            </td>
                            <td
                              className="px-2 py-1.5 text-right tabular-nums font-medium"
                              style={{ color: colorFor(modelId) }}
                            >
                              ${agg.cost.toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="bg-card/30 border-foreground/5 rounded-lg border p-3"
      style={{ boxShadow: `inset 0 0 0 1px ${accent.replace(")", " / 0.08)")}` }}
    >
      <div className="text-muted-foreground/70 mb-1 flex items-center gap-1.5 font-mono text-[9.5px] tracking-wider uppercase">
        <span style={{ color: accent }}>{icon}</span>
        {label}
      </div>
      <div className="text-foreground/95 font-mono text-[18px] font-medium tabular-nums">
        {value}
      </div>
    </div>
  );
}

function TTFTChart({ sessions, maxTtft }: { sessions: Session[]; maxTtft: number }) {
  if (sessions.length === 0) {
    return (
      <div className="text-muted-foreground/55 py-8 text-center font-mono text-[10.5px]">
        等待 sessions…
      </div>
    );
  }
  const W = 100;
  const H = 60;
  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="首 token 延迟 (TTFT) 时间线"
        className="bg-foreground/[0.02] h-32 w-full rounded"
      >
        <title>TTFT 时间线</title>
        {sessions.map((s, i) => {
          const x = (i / Math.max(1, sessions.length - 1)) * W;
          const y = H - (s.ttftMs / maxTtft) * H;
          return (
            <circle
              key={s.id}
              cx={x}
              cy={y}
              r={1.2}
              style={{ fill: colorFor(s.model) }}
              opacity={0.85}
            />
          );
        })}
        {/* 趋势线：连接最近点 */}
        {sessions.length > 1 &&
          (() => {
            const pts = sessions
              .map((s, i) => {
                const x = (i / Math.max(1, sessions.length - 1)) * W;
                const y = H - (s.ttftMs / maxTtft) * H;
                return `${x.toFixed(2)},${y.toFixed(2)}`;
              })
              .join(" ");
            return (
              <polyline
                points={pts}
                fill="none"
                stroke="oklch(0.65 0.02 250)"
                strokeWidth={0.4}
                opacity={0.4}
              />
            );
          })()}
      </svg>
      <div className="text-muted-foreground/55 flex justify-between font-mono text-[9px]">
        <span>0 ms</span>
        <span>{Math.round(maxTtft)} ms</span>
      </div>
    </div>
  );
}

function CostChart({ sessions }: { sessions: Array<Session & { cumulative: number }> }) {
  if (sessions.length === 0) {
    return (
      <div className="text-muted-foreground/55 py-8 text-center font-mono text-[10.5px]">
        等待 sessions…
      </div>
    );
  }
  const W = 100;
  const H = 60;
  const maxCum = sessions[sessions.length - 1]?.cumulative ?? 0.01;
  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="首 token 延迟 (TTFT) 时间线"
        className="bg-foreground/[0.02] h-32 w-full rounded"
      >
        <title>TTFT 时间线</title>
        {/* area under line */}
        {(() => {
          const pts = sessions.map((s, i) => {
            const x = (i / Math.max(1, sessions.length - 1)) * W;
            const y = H - (s.cumulative / maxCum) * H;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
          });
          return (
            <>
              <polygon
                points={`0,${H} ${pts.join(" ")} ${W},${H}`}
                fill="oklch(0.78 0.16 75 / 0.18)"
              />
              <polyline
                points={pts.join(" ")}
                fill="none"
                stroke="oklch(0.78 0.16 75)"
                strokeWidth={0.6}
              />
            </>
          );
        })()}
      </svg>
      <div className="text-muted-foreground/55 flex justify-between font-mono text-[9px]">
        <span>$0</span>
        <span>${maxCum.toFixed(4)}</span>
      </div>
    </div>
  );
}
