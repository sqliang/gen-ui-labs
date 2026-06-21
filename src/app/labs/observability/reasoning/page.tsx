/* biome-ignore-all lint/a11y/useSemanticElements: SVG g cannot be <button>
   biome-ignore-all lint/a11y/noStaticElementInteractions: SVG g interactive
   ------------------------------------------------------------------ */

"use client";

import { ChevronLeft, ChevronRight, Circle, Download, GitBranch, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LabContentPage, StatusPill } from "@/components/lab-content-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Lab 4.1.3 — Agent 推理链（真功能）
 *
 * 三种 agent pattern：
 * - CoT (Chain of Thought): 线性思维链
 * - ReAct (Reason + Act): think → act → observe 循环
 * - Plan: DAG 任务分解（plan → subtasks → results）
 *
 * 视觉化：SVG DAG 节点 + 边，自动布局（按 layer/level 横向排）
 * 交互：点击节点看完整 prompt/response；时间轴逐步重放；导出 .md
 */

type NodeKind = "think" | "act" | "observe" | "plan" | "task" | "result";

type DagNode = {
  id: string;
  kind: NodeKind;
  label: string;
  prompt: string;
  response: string;
  ts: number;
  /** DAG 坐标（自动布局填入） */
  x?: number;
  y?: number;
  layer?: number;
};

type DagEdge = {
  from: string;
  to: string;
  label?: string;
};

type Pattern = "cot" | "react" | "plan";

type PatternData = {
  nodes: DagNode[];
  edges: DagEdge[];
};

const PATTERNS: Record<Pattern, PatternData> = {
  cot: {
    nodes: [
      {
        id: "n1",
        kind: "think",
        label: "理解问题",
        prompt: "用户问：'为什么天空是蓝色的？'",
        response: "需要解释 Rayleigh 散射：光在大气中被空气分子散射，蓝光波长短所以散射最强。",
        ts: 0,
      },
      {
        id: "n2",
        kind: "think",
        label: "拆解机制",
        prompt: "继续：解释散射机制",
        response: "太阳光包含 7 种颜色 → 大气分子尺度远小于可见光波长 → 选择性散射 ∝ 1/λ⁴。",
        ts: 800,
      },
      {
        id: "n3",
        kind: "think",
        label: "综合答案",
        prompt: "整合成最终答案",
        response:
          "天空呈现蓝色是因为大气对短波长光的散射远强于长波长光，导致我们看到的天空以蓝色为主。",
        ts: 1600,
      },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
    ],
  },
  react: {
    nodes: [
      {
        id: "r1",
        kind: "think",
        label: "思考 1",
        prompt: "需要查询北京天气",
        response: "我应该调用 get_weather 工具获取北京天气。",
        ts: 0,
      },
      {
        id: "r2",
        kind: "act",
        label: "调用天气 API",
        prompt: "Tool: get_weather(city=北京)",
        response: '{"temp": 18, "humidity": 45, "condition": "晴"}',
        ts: 600,
      },
      {
        id: "r3",
        kind: "observe",
        label: "观察结果",
        prompt: "Tool 返回",
        response: "北京当前 18°C，湿度 45%，晴。需要把数据组织成易读格式。",
        ts: 1100,
      },
      {
        id: "r4",
        kind: "think",
        label: "思考 2",
        prompt: "结合穿衣建议",
        response: "18°C 建议穿薄外套。生成完整回答。",
        ts: 1700,
      },
      {
        id: "r5",
        kind: "act",
        label: "输出最终答案",
        prompt: "Final answer",
        response: "北京今天 18°C，晴，湿度 45%。建议穿薄外套。",
        ts: 2400,
      },
    ],
    edges: [
      { from: "r1", to: "r2", label: "→" },
      { from: "r2", to: "r3", label: "→" },
      { from: "r3", to: "r4", label: "→" },
      { from: "r4", to: "r5", label: "→" },
    ],
  },
  plan: {
    nodes: [
      {
        id: "p0",
        kind: "plan",
        label: "主计划",
        prompt: "目标：写一篇关于 AI 编程助手的博客",
        response: "分解为：1)调研工具 2)分析趋势 3)写文章 4)校对",
        ts: 0,
      },
      {
        id: "p1",
        kind: "task",
        label: "调研工具",
        prompt: "subtask: 调研主流 AI 编程工具",
        response: "GitHub Copilot / Cursor / Cline / Claude Code",
        ts: 800,
      },
      {
        id: "p2",
        kind: "task",
        label: "分析趋势",
        prompt: "subtask: 分析行业趋势",
        response: "agent 化 / 多模态 / sandbox 隔离",
        ts: 1700,
      },
      {
        id: "p3",
        kind: "task",
        label: "写文章",
        prompt: "subtask: 写 2000 字文章",
        response: "完成初稿：分 4 节展开",
        ts: 2600,
      },
      {
        id: "p4",
        kind: "task",
        label: "校对",
        prompt: "subtask: 校对",
        response: "修正 3 处拼写 + 润色",
        ts: 3500,
      },
      {
        id: "p5",
        kind: "result",
        label: "最终成果",
        prompt: "合并所有子任务",
        response: "博客文章 ready: 4 节 + 2 表格 + 8 引用",
        ts: 4200,
      },
    ],
    edges: [
      { from: "p0", to: "p1", label: "decompose" },
      { from: "p0", to: "p2", label: "decompose" },
      { from: "p0", to: "p3", label: "decompose" },
      { from: "p0", to: "p4", label: "decompose" },
      { from: "p1", to: "p5" },
      { from: "p2", to: "p5" },
      { from: "p3", to: "p5" },
      { from: "p4", to: "p5" },
    ],
  },
};

const KIND_COLORS: Record<NodeKind, string> = {
  think: "oklch(0.78 0.16 230)",
  act: "oklch(0.78 0.16 75)",
  observe: "oklch(0.7 0.22 30)",
  plan: "oklch(0.78 0.16 300)",
  task: "oklch(0.65 0.02 250)",
  result: "oklch(0.78 0.16 145)",
};

const PATTERN_LABELS: Record<Pattern, string> = {
  cot: "Chain of Thought",
  react: "ReAct",
  plan: "Plan + Execute",
};

export default function ReasoningPage() {
  const [pattern, setPattern] = useState<Pattern>("cot");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const cursorRef = useRef(0);
  cursorRef.current = cursor;

  const data = PATTERNS[pattern];

  // 自动 layout：拓扑分层（最长路径算法）
  const laid = useMemo(() => layoutDag(data), [data]);

  // 重置 cursor 当切 pattern
  // biome-ignore lint/correctness/useExhaustiveDependencies: 显式只在 pattern 变化时重置
  useEffect(() => {
    setCursor(0);
    setSelectedId(null);
    setIsPlaying(false);
  }, [pattern]);

  // play loop
  useEffect(() => {
    if (!isPlaying) return;
    const max = laid.nodes.length;
    const t = setInterval(() => {
      if (cursorRef.current < max) {
        setCursor((c) => c + 1);
      } else {
        setIsPlaying(false);
      }
    }, 600);
    return () => clearInterval(t);
  }, [isPlaying, laid.nodes.length]);

  const handleReset = () => {
    setCursor(0);
    setIsPlaying(false);
  };

  // 导出 markdown
  const handleExport = () => {
    const lines: string[] = [
      `# ${PATTERN_LABELS[pattern]} reasoning trace`,
      "",
      "```",
      `pattern: ${pattern}`,
      `nodes: ${laid.nodes.length}`,
      `edges: ${laid.edges.length}`,
      `generated: ${new Date().toISOString()}`,
      "```",
      "",
    ];
    for (const n of laid.nodes) {
      lines.push(`## ${n.label} (${n.kind})`);
      lines.push("");
      lines.push("**Prompt:**");
      lines.push("");
      lines.push(`> ${n.prompt}`);
      lines.push("");
      lines.push("**Response:**");
      lines.push("");
      lines.push(`> ${n.response}`);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reasoning-${pattern}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selected = selectedId ? laid.nodes.find((n) => n.id === selectedId) : null;
  const activeNode = laid.nodes[cursor - 1];

  return (
    <LabContentPage
      labId="observability"
      subNumber="4.1.3"
      title="Agent 推理链"
      protocolLabel="W9 · CoT · ReAct · Plan"
      description="三种 agent pattern 思维过程可视化：线性思维链 / ReAct 循环 / 计划分解 DAG。点击节点查看完整 prompt/response，拖动时间轴逐步重放，可导出 .md。"
      isStreaming={isPlaying}
      onStart={() => setIsPlaying(true)}
      onReset={handleReset}
      startLabel={isPlaying ? "暂停" : "播放"}
      outputEmpty={false}
      outputExtra={
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <StatusPill label={`${cursor} / ${laid.nodes.length}`} tone="muted" />
          <StatusPill label={`${laid.edges.length} edges`} tone="muted" />
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              pattern
            </span>
            <div className="flex gap-1">
              {(Object.keys(PATTERNS) as Pattern[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPattern(p)}
                  className={cn(
                    "rounded border px-2 py-1 font-mono text-[10.5px] transition-colors",
                    pattern === p
                      ? "border-foreground/30 bg-foreground/[0.08] text-foreground/95"
                      : "border-foreground/10 hover:border-foreground/30 text-muted-foreground/85",
                  )}
                >
                  {PATTERN_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="text-muted-foreground/85 hover:text-foreground/95 flex items-center gap-1.5 rounded border border-foreground/10 px-2 py-1 font-mono text-[10.5px] transition-colors"
          >
            <Download className="size-3" />
            export .md
          </button>
        </div>
      }
      output={
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="bg-card/30 border-foreground/5 lg:col-span-2">
            <CardHeader className="border-foreground/5 border-b p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                <GitBranch className="mr-1.5 inline size-3" />
                {PATTERN_LABELS[pattern]} · DAG
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  click 节点查看详情
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-3">
              <DagSvg
                nodes={laid.nodes}
                edges={laid.edges}
                selectedId={selectedId}
                activeId={activeNode?.id ?? null}
                cursor={cursor}
                onSelect={setSelectedId}
              />
              {/* scrubber */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCursor(Math.max(0, cursor - 1))}
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <input
                  type="range"
                  min={0}
                  max={laid.nodes.length}
                  value={cursor}
                  onChange={(e) => {
                    setCursor(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="flex-1"
                  aria-label="replay scrubber"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCursor(Math.min(laid.nodes.length, cursor + 1))}
                >
                  <ChevronRight className="size-3" />
                </Button>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="rounded border border-foreground/15 px-2 py-1"
                >
                  {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
                </button>
              </div>
              {/* legend */}
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px]">
                {(Object.entries(KIND_COLORS) as [NodeKind, string][]).map(([k, c]) =>
                  laid.nodes.some((n) => n.kind === k) ? (
                    <span key={k} className="flex items-center gap-1.5">
                      <Circle className="size-2.5" style={{ color: c, fill: c }} />
                      <span className="text-muted-foreground/85 uppercase">{k}</span>
                    </span>
                  ) : null,
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="border-foreground/5 border-b p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                Inspector
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  {selected ? selected.label : "未选中"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-3">
              {selected ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                      kind
                    </div>
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase"
                      style={{
                        color: KIND_COLORS[selected.kind],
                        backgroundColor: `${KIND_COLORS[selected.kind].replace(")", " / 0.15)")}`,
                      }}
                    >
                      {selected.kind}
                    </span>
                  </div>
                  <div>
                    <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                      prompt
                    </div>
                    <pre className="bg-foreground/[0.05] max-h-32 overflow-auto rounded p-2 font-mono text-[10.5px] leading-relaxed">
                      {selected.prompt}
                    </pre>
                  </div>
                  <div>
                    <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                      response
                    </div>
                    <pre className="bg-[#0d1117] border-foreground/10 max-h-40 overflow-auto rounded border p-2 font-mono text-[10px] leading-relaxed">
                      {selected.response}
                    </pre>
                  </div>
                  <div>
                    <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                      timestamp
                    </div>
                    <code className="font-mono text-[10.5px]">+{selected.ts}ms</code>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground/65 py-8 text-center font-mono text-[11px]">
                  ← click a node
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}

function DagSvg({
  nodes,
  edges,
  selectedId,
  activeId,
  cursor,
  onSelect,
}: {
  nodes: DagNode[];
  edges: DagEdge[];
  selectedId: string | null;
  activeId: string | null;
  cursor: number;
  onSelect: (id: string) => void;
}) {
  if (nodes.length === 0) {
    return (
      <div className="text-muted-foreground/55 py-8 text-center font-mono text-[11px]">
        （empty DAG）
      </div>
    );
  }
  // 计算 svg viewBox
  const xs = nodes.map((n) => n.x ?? 0);
  const ys = nodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs) - 30;
  const maxX = Math.max(...xs) + 150;
  const minY = Math.min(...ys) - 20;
  const maxY = Math.max(...ys) + 60;
  const W = maxX - minX;
  const H = maxY - minY;

  return (
    <svg
      viewBox={`${minX} ${minY} ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Agent 推理链 DAG"
      className="bg-foreground/[0.02] w-full rounded"
      style={{ minHeight: 320 }}
    >
      <title>Reasoning DAG</title>
      {/* edges */}
      {edges.map((e) => {
        const from = nodes.find((n) => n.id === e.from);
        const to = nodes.find((n) => n.id === e.to);
        if (!from || !to) return null;
        // 边两端点：rectangle 中心
        const x1 = (from.x ?? 0) + 50;
        const y1 = (from.y ?? 0) + 20;
        const x2 = to.x ?? 0;
        const y2 = (to.y ?? 0) + 20;
        // 简单水平贝塞尔
        const cx1 = x1 + (x2 - x1) / 2;
        const cx2 = x1 + (x2 - x1) / 2;
        return (
          <g key={`${e.from}-${e.to}-${edges.length}`}>
            <path
              d={`M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`}
              fill="none"
              stroke="oklch(0.55 0.02 250 / 0.5)"
              strokeWidth={0.8}
              markerEnd="url(#arrow)"
            />
            {e.label ? (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 4}
                textAnchor="middle"
                fill="oklch(0.6 0.02 250)"
                fontSize={5}
                fontFamily="ui-monospace, monospace"
              >
                {e.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {/* arrow marker */}
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.55 0.02 250 / 0.7)" />
        </marker>
      </defs>
      {/* nodes */}
      {nodes.map((n, i) => {
        const isSelected = selectedId === n.id;
        const isActive = activeId === n.id;
        const isReached = i < cursor;
        const color = KIND_COLORS[n.kind];
        return (
          <g
            key={n.id}
            transform={`translate(${n.x}, ${n.y})`}
            onClick={() => onSelect(n.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(n.id);
            }}
            style={{ cursor: "pointer" }}
          >
            <rect
              width={100}
              height={40}
              rx={6}
              fill={
                isActive
                  ? `${color.replace(")", " / 0.3)")}`
                  : isReached
                    ? `${color.replace(")", " / 0.18)")}`
                    : "oklch(0.18 0.005 250 / 0.7)"
              }
              stroke={
                isSelected
                  ? color
                  : isReached
                    ? `${color.replace(")", " / 0.6)")}`
                    : "oklch(0.4 0.02 250 / 0.3)"
              }
              strokeWidth={isSelected ? 1.2 : 0.6}
            />
            <text
              x={50}
              y={15}
              textAnchor="middle"
              fill={isReached ? color : "oklch(0.55 0.02 250)"}
              fontSize={6}
              fontFamily="ui-monospace, monospace"
              fontWeight="600"
            >
              {n.kind.toUpperCase()}
            </text>
            <text
              x={50}
              y={28}
              textAnchor="middle"
              fill={isReached ? "oklch(0.92 0.005 250)" : "oklch(0.6 0.02 250)"}
              fontSize={7}
              fontFamily="ui-monospace, monospace"
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** 最长路径分层布局 */
function layoutDag(data: PatternData): PatternData {
  const { nodes, edges } = data;
  const outMap = new Map<string, string[]>();
  const inMap = new Map<string, string[]>();
  for (const n of nodes) {
    outMap.set(n.id, []);
    inMap.set(n.id, []);
  }
  for (const e of edges) {
    outMap.get(e.from)?.push(e.to);
    inMap.get(e.to)?.push(e.from);
  }
  // BFS by layer
  const layer = new Map<string, number>();
  for (const n of nodes) {
    const ins = inMap.get(n.id) ?? [];
    if (ins.length === 0) layer.set(n.id, 0);
  }
  // 拓扑：可能不严格 DAG（plan pattern 有环？），但用迭代最多 N 次
  for (let iter = 0; iter < nodes.length + 1; iter++) {
    let changed = false;
    for (const n of nodes) {
      const ins = inMap.get(n.id) ?? [];
      if (ins.length === 0) continue;
      const maxL = Math.max(...ins.map((id) => layer.get(id) ?? 0));
      const cur = layer.get(n.id) ?? -1;
      if (cur < maxL + 1) {
        layer.set(n.id, maxL + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }
  // 同 layer 内 y 错开
  const layerGroups = new Map<number, DagNode[]>();
  for (const n of nodes) {
    const l = layer.get(n.id) ?? 0;
    if (!layerGroups.has(l)) layerGroups.set(l, []);
    layerGroups.get(l)?.push(n);
  }
  const X_STEP = 160;
  const Y_STEP = 70;
  for (const n of nodes) {
    const l = layer.get(n.id) ?? 0;
    const group = layerGroups.get(l) ?? [];
    const i = group.indexOf(n);
    n.layer = l;
    n.x = l * X_STEP;
    n.y = i * Y_STEP;
  }
  return { nodes, edges };
}
