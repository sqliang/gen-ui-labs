"use client";
import { Accessibility, Layers, Shield, Sparkles, Star } from "lucide-react";
import { useState } from "react";

import { LabContentPage, StatusPill } from "@/components/lab-content-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JsonUiDocument, JsonUiNode } from "@/core/engine/json-ui/types";
import { BUILTIN_MODELS } from "@/core/models/registry";
import { cn } from "@/lib/utils";

/**
 * Lab 4.1.4 — UI 评分卡（真功能）
 *
 * 同 prompt × N 模型 → 4 维评分横向对比。
 *
 * 评分启发式（每维 0-10）：
 * - aesthetic: 色彩种类（≥3 +3, ≤6 +3）+ 字号阶梯数（≥3 +2, ≤5 +2）
 * - a11y: 按钮/输入有 label 占比（×10 capped 10）
 * - structure: 嵌套深度（1-3: 10, 4-5: 7, 6-7: 4, >7: 2）
 * - stability: 1 - (error nodes / total nodes) × 10
 *
 * mock：每个 model 生成一个 deterministic 的 JsonUiDocument（基于
 * model id hash 选择不同模板）
 */

const PROMPT_PRESETS = [
  "做一个仪表盘：3 个 KPI + 1 个表格 + 1 个 chart",
  "做一个登录页：title + email input + password input + submit",
  "做一个 todo list：title + input + list + 3 items",
] as const;

type ModelScore = {
  modelId: string;
  modelLabel: string;
  provider: string;
  doc: JsonUiDocument;
  scores: { aesthetic: number; a11y: number; structure: number; stability: number };
  total: number;
  cost: number;
  durationMs: number;
};

const ACCENT = "oklch(0.78 0.16 75)";

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

/** 根据 prompt + modelId 生成 deterministic mock JSON-UI doc */
function mockGen(prompt: string, modelId: string): JsonUiDocument {
  const seed = hash(`${modelId}:${prompt}`);
  const r = (i: number) => (seed + i * 7) % 10;
  const title = prompt.split(/[：:]/)[0]?.slice(0, 24) || "GenUI Demo";
  return {
    root: {
      type: "card",
      props: { title, accent: ACCENT },
      children: [
        {
          type: "grid",
          props: { columns: 3 },
          children: [
            {
              type: "card",
              props: { title: "活跃", content: r(1) * 100 + 50, accent: "oklch(0.78 0.16 230)" },
            },
            {
              type: "card",
              props: { title: "新增", content: r(2) * 80 + 20, accent: "oklch(0.78 0.16 145)" },
            },
            {
              type: "card",
              props: { title: "留存", content: r(3) * 5 + 5, accent: "oklch(0.78 0.16 75)" },
            },
          ],
        },
        { type: "text", props: { content: prompt } },
        { type: "button", props: { label: "Run" } },
      ],
    },
  };
}

/** 4 维评分 */
function scoreDoc(doc: JsonUiDocument, _modelId: string, _durationMs: number) {
  const root = doc.root;
  const allNodes: JsonUiNode[] = [];
  const walk = (n: JsonUiNode, depth: number) => {
    (allNodes as Array<JsonUiNode & { _depth: number }>).push({ ...n, _depth: depth });
    for (const c of n.children ?? []) walk(c, depth + 1);
  };
  walk(root, 0);
  const total = allNodes.length || 1;

  // 1. aesthetic
  const colors = new Set<string>();
  const fontSizes = new Set<number>();
  for (const n of allNodes) {
    const p = n.props ?? {};
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === "string" && v.startsWith("oklch")) colors.add(v);
      if (k === "size" && typeof v === "number") fontSizes.add(v);
    }
  }
  const aesthetic = Math.min(
    10,
    (colors.size >= 3 ? 3 : colors.size) +
      (colors.size <= 6 ? 3 : 0) +
      (fontSizes.size >= 2 ? 2 : 0) +
      2,
  );

  // 2. a11y: 检查 button/input 有 label
  let interactive = 0;
  let withLabel = 0;
  for (const n of allNodes) {
    if (n.type === "button" || n.type === "input") {
      interactive++;
      if (typeof n.props?.label === "string" && n.props.label.length > 0) withLabel++;
    }
  }
  const a11y = interactive > 0 ? Math.round((withLabel / interactive) * 10) : 8;

  // 3. structure: 嵌套深度
  let maxDepth = 0;
  const walkD = (n: JsonUiNode, d: number) => {
    if (d > maxDepth) maxDepth = d;
    for (const c of n.children ?? []) walkD(c, d + 1);
  };
  walkD(root, 0);
  const structure = maxDepth <= 3 ? 10 : maxDepth <= 5 ? 7 : maxDepth <= 7 ? 4 : 2;

  // 4. stability: 1 - error_rate
  const errNodes = allNodes.filter((n) => n.props?.error === true).length;
  const stability = Math.max(0, Math.round((1 - errNodes / total) * 10));

  return {
    aesthetic,
    a11y,
    structure,
    stability,
  };
}

const DIM_META = [
  { key: "aesthetic" as const, label: "Aesthetic", icon: Sparkles, color: "oklch(0.78 0.16 300)" },
  { key: "a11y" as const, label: "A11y", icon: Accessibility, color: "oklch(0.78 0.16 145)" },
  { key: "structure" as const, label: "Structure", icon: Layers, color: "oklch(0.78 0.16 230)" },
  { key: "stability" as const, label: "Stability", icon: Shield, color: "oklch(0.7 0.22 30)" },
];

export default function ScorePage() {
  const [prompt, setPrompt] = useState<string>(PROMPT_PRESETS[0]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set(["gpt-4o-mini", "claude-haiku-4-5", "deepseek-chat", "gemini-2.5-flash"]),
  );
  const [results, setResults] = useState<ModelScore[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setResults(null);
    await new Promise((r) => setTimeout(r, 400));
    try {
      const out: ModelScore[] = [];
      for (const id of selectedModels) {
        const m = BUILTIN_MODELS.find((x) => x.id === id);
        if (!m) continue;
        const doc = mockGen(prompt, id);
        const scores = scoreDoc(doc, id, 0);
        const total = Math.round(
          (scores.aesthetic + scores.a11y + scores.structure + scores.stability) / 4,
        );
        const cost = ((m.costPerMillionInput ?? 0) + (m.costPerMillionOutput ?? 0)) * 0.001;
        const durationMs = 600 + (hash(id) % 1200);
        out.push({
          modelId: id,
          modelLabel: m.label,
          provider: m.provider,
          doc,
          scores,
          total,
          cost,
          durationMs,
        });
      }
      setResults(out);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setResults(null);
  };

  const handleToggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <LabContentPage
      labId="observability"
      subNumber="4.1.4"
      title="UI 评分卡"
      protocolLabel="W9 · multi-model · rubric"
      description="同 prompt × N 模型并行生成 UI，按 4 维评分横向对比：aesthetic / a11y / structure / stability。评分基于 JSON-UI 节点启发式规则。"
      isStreaming={isRunning}
      errorMsg={errorMsg}
      onStart={handleRun}
      onReset={handleReset}
      startLabel="运行评分"
      outputEmpty={!results}
      outputEmptyHint={
        <div className="text-muted-foreground/70 py-10 text-center font-mono text-[12px]">
          选 model → 点「运行评分」横向对比
        </div>
      }
      outputExtra={
        results ? (
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <StatusPill label={`${results.length} models`} tone="muted" />
            <StatusPill
              label={`avg ${Math.round(results.reduce((a, b) => a + b.total, 0) / results.length)}/10`}
              tone="success"
            />
          </div>
        ) : null
      }
      toolbar={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              prompt
            </span>
            <select
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-foreground/[0.04] border-foreground/15 rounded border px-2 py-1 font-mono text-[10.5px]"
            >
              {PROMPT_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p.slice(0, 40)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-muted-foreground/80 mr-1 font-mono text-[10px] tracking-wider uppercase">
              models
            </span>
            {BUILTIN_MODELS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => handleToggleModel(m.id)}
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[9.5px] transition-colors",
                  selectedModels.has(m.id)
                    ? "border-foreground/30 bg-foreground/[0.08] text-foreground/95"
                    : "border-foreground/10 text-muted-foreground/65 hover:border-foreground/20",
                )}
              >
                {m.id}
              </button>
            ))}
          </div>
        </div>
      }
      output={
        results ? (
          <div className="space-y-3">
            {/* 雷达图对比 */}
            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="border-foreground/5 border-b p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  <Star className="mr-1.5 inline size-3" />4 维评分对比 · radar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-3">
                <RadarChart results={results} />
              </CardContent>
            </Card>

            {/* 对比表 */}
            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="border-foreground/5 border-b p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  横向对比表
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-3">
                <table className="w-full font-mono text-[10.5px]">
                  <thead>
                    <tr className="text-muted-foreground/70 text-[9.5px] tracking-wider uppercase">
                      <th className="px-2 py-1.5 text-left">model</th>
                      {DIM_META.map((d) => (
                        <th
                          key={d.key}
                          className="px-2 py-1.5 text-right"
                          style={{ color: d.color }}
                        >
                          {d.label}
                        </th>
                      ))}
                      <th className="px-2 py-1.5 text-right">total</th>
                      <th className="px-2 py-1.5 text-right">cost</th>
                      <th className="px-2 py-1.5 text-right">latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results
                      .slice()
                      .sort((a, b) => b.total - a.total)
                      .map((r) => (
                        <tr
                          key={r.modelId}
                          className="hover:bg-foreground/[0.04] border-foreground/5 border-t"
                        >
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="inline-block size-2 rounded-full"
                                style={{ backgroundColor: providerColor(r.provider) }}
                              />
                              <span>{r.modelId}</span>
                            </div>
                          </td>
                          {DIM_META.map((d) => (
                            <td
                              key={d.key}
                              className="px-2 py-1.5 text-right tabular-nums"
                              style={{ color: d.color }}
                            >
                              {r.scores[d.key]}
                            </td>
                          ))}
                          <td
                            className="px-2 py-1.5 text-right font-medium tabular-nums"
                            style={{
                              color:
                                r.total >= 8
                                  ? "oklch(0.78 0.16 145)"
                                  : r.total >= 5
                                    ? "oklch(0.78 0.16 75)"
                                    : "oklch(0.7 0.22 30)",
                            }}
                          >
                            {r.total}
                          </td>
                          <td className="text-muted-foreground/85 px-2 py-1.5 text-right tabular-nums">
                            ${r.cost.toFixed(4)}
                          </td>
                          <td className="text-muted-foreground/85 px-2 py-1.5 text-right tabular-nums">
                            {r.durationMs}ms
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        ) : null
      }
    />
  );
}

function providerColor(p: string): string {
  const map: Record<string, string> = {
    openai: "oklch(0.78 0.16 230)",
    anthropic: "oklch(0.7 0.22 30)",
    google: "oklch(0.78 0.16 145)",
    deepseek: "oklch(0.72 0.16 300)",
    qwen: "oklch(0.78 0.16 75)",
    ollama: "oklch(0.65 0.02 250)",
  };
  return map[p] ?? "oklch(0.65 0.02 250)";
}

function RadarChart({ results }: { results: ModelScore[] }) {
  const W = 360;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const R = 130;
  const N = DIM_META.length;

  // 顶点坐标
  const points = DIM_META.map((d, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * R,
      y: cy + Math.sin(angle) * R,
      label: d.label,
      color: d.color,
    };
  });

  // 雷达层（10/8/6/4/2）
  const rings = [2, 4, 6, 8, 10];

  // 每个 model 的多边形
  const modelPolys = results.map((r, i) => {
    const c = `oklch(${0.6 + i * 0.05} ${0.15 - i * 0.01} ${(i * 67) % 360})`;
    const path = DIM_META.map((d, j) => {
      const v = r.scores[d.key];
      const angle = (j / N) * Math.PI * 2 - Math.PI / 2;
      const rr = (v / 10) * R;
      return `${cx + Math.cos(angle) * rr},${cy + Math.sin(angle) * rr}`;
    }).join(" ");
    return { modelId: r.modelId, color: c, path };
  });

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="4 维评分雷达图"
        className="bg-foreground/[0.02] mx-auto w-full max-w-[420px] rounded"
      >
        <title>评分雷达</title>
        {/* rings */}
        {rings.map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={(r / 10) * R}
            fill="none"
            stroke="oklch(0.4 0.02 250 / 0.3)"
            strokeWidth={0.5}
          />
        ))}
        {/* spokes */}
        {points.map((p) => (
          <line
            key={`spoke-${p.label}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="oklch(0.4 0.02 250 / 0.3)"
            strokeWidth={0.5}
          />
        ))}
        {/* model polys */}
        {modelPolys.map((m) => (
          <g key={m.modelId}>
            <polygon
              points={m.path}
              fill={m.color.replace(")", " / 0.15)")}
              stroke={m.color}
              strokeWidth={1.2}
            />
          </g>
        ))}
        {/* vertex dots for each model */}
        {results.flatMap((r, mi) =>
          DIM_META.map((d, di) => {
            const v = r.scores[d.key];
            const angle = (di / N) * Math.PI * 2 - Math.PI / 2;
            const rr = (v / 10) * R;
            return (
              <circle
                key={`${r.modelId}-${d.key}`}
                cx={cx + Math.cos(angle) * rr}
                cy={cy + Math.sin(angle) * rr}
                r={1.5}
                fill={modelPolys[mi]?.color}
              />
            );
          }),
        )}
        {/* axis labels */}
        {points.map((p) => (
          <text
            key={`label-${p.label}`}
            x={p.x + (p.x > cx ? 4 : p.x < cx ? -4 : 0)}
            y={p.y + (p.y > cy ? 12 : -4)}
            textAnchor={p.x > cx ? "start" : p.x < cx ? "end" : "middle"}
            fill={p.color}
            fontSize="10"
            fontFamily="ui-monospace, monospace"
            fontWeight="600"
          >
            {p.label}
          </text>
        ))}
      </svg>
      {/* legend */}
      <div className="flex flex-wrap justify-center gap-3 font-mono text-[10px]">
        {modelPolys.map((m) => (
          <span key={m.modelId} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ backgroundColor: m.color, opacity: 0.5 }}
            />
            <span style={{ color: m.color }}>{m.modelId}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
