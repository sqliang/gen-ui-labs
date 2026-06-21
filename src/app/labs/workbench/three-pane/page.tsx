"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Field, LabContentPage, PresetChips, StatusPill } from "@/components/lab-content-page";
import { Button } from "@/components/ui/button";
import { applyJsonUiPatch } from "@/core/engine/json-ui/apply";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument, JsonUiNode, JsonUiPatch } from "@/core/engine/json-ui/types";
import { fetchSse } from "@/infra/http/sse-client";

/**
 * Lab 3.1.1 — 三栏 Workbench（真功能）
 *
 * 设计：
 * - 左栏：DSL 源码（JSON.stringify 实时显示）
 * - 中栏：patch 流时间线（mount/patch/unmount 按类型 chip 化）
 * - 右栏：实时渲染（用 JsonUiRenderer）
 *
 * 不引新依赖（不装 monaco / react-resizable-panels）：
 * - 3 栏用 CSS Grid 1fr 1fr 1fr
 * - scenario chips 选 default / chart / form 触发不同 patch 序列
 * - ⌘/Ctrl+Enter 快捷键
 *
 * 状态机：
 * - patches: 累积所有 patch
 * - doc: 累积的 JsonUiDocument
 * - selectedNodeId: 中栏 hover 高亮
 */

export default function WorkbenchThreePanePage() {
  const [doc, setDoc] = useState<JsonUiDocument>({
    root: { type: "text", props: { content: "等待…" } as never },
  });
  const [patches, setPatches] = useState<JsonUiPatch[]>([]);
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scenario, setScenario] = useState<"default" | "chart" | "form">("default");
  const abortRef = useRef<AbortController | null>(null);

  const handleStart = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setIsStreaming(true);
    setErrorMsg(null);
    setPatches([]);
    setDoc({ root: { type: "text", props: { content: "加载中…" } as never } });

    let cur: JsonUiDocument = { root: { type: "text", props: { content: "…" } as never } };
    let accumulated: JsonUiPatch[] = [];
    try {
      for await (const evt of fetchSse("/api/json-ui", {
        body: { scenario },
        signal: ac.signal,
      })) {
        let patch: JsonUiPatch;
        try {
          patch = JSON.parse(evt.data) as JsonUiPatch;
        } catch {
          continue;
        }
        cur = applyJsonUiPatch(cur, patch);
        accumulated = [...accumulated, patch];
        setDoc(cur);
        setPatches(accumulated);
      }
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [scenario]);

  // 节点统计
  const stats = useMemo(() => {
    let mounts = 0;
    let patchesCount = 0;
    let unmounts = 0;
    for (const p of patches) {
      if (p.op === "mount") mounts++;
      else if (p.op === "patch") patchesCount++;
      else if (p.op === "unmount") unmounts++;
    }
    return { mounts, patches: patchesCount, unmounts };
  }, [patches]);

  // 键盘快捷键：Cmd/Ctrl+Enter 触发 start
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleStart]);

  return (
    <LabContentPage
      labId="workbench"
      subNumber="3.1.1"
      title="三栏 Workbench"
      protocolLabel="W6 · 3-pane layout"
      description="左 DSL 源码 · 中 patch 流时间线 · 右实时渲染。手动选 scenario 触发不同 patch 序列。"
      isStreaming={isStreaming}
      errorMsg={errorMsg}
      onStart={handleStart}
      onStop={() => {
        abortRef.current?.abort();
        setIsStreaming(false);
      }}
      onReset={() => {
        setDoc({ root: { type: "text", props: { content: "已重置" } as never } });
        setPatches([]);
        setSelectedNodePath(null);
      }}
      startLabel="开始 patch 流"
      outputEmpty={patches.length === 0 && !isStreaming}
      outputEmptyHint={
        <div className="text-muted-foreground/70 py-10 text-center font-mono text-[12px]">
          选 scenario → 点「开始 patch 流」→ 中栏会按时间轴出 mount/patch/unmount，
          右栏实时渲染。⌘/Ctrl+Enter 也行。
        </div>
      }
      outputExtra={
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <StatusPill label={`mount ${stats.mounts}`} tone="success" />
          <StatusPill label={`patch ${stats.patches}`} tone="muted" />
          <StatusPill label={`unmount ${stats.unmounts}`} tone="warn" />
          <span className="text-muted-foreground/60">|</span>
          <span className="text-muted-foreground/70">{patches.length} total</span>
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <Field label="scenario">
            <PresetChips
              options={[
                { label: "default", value: "default" },
                { label: "chart", value: "chart" },
                { label: "form", value: "form" },
              ]}
              value={scenario}
              onChange={setScenario}
            />
          </Field>
          <Field label="快捷键" hint="⌘/Ctrl+Enter 触发">
            <span className="text-muted-foreground/70 font-mono text-[11px]">
              开始 / 停止 / 重置
            </span>
          </Field>
        </div>
      }
      output={
        <div className="space-y-3">
          {/* 三栏布局（CSS Grid 1fr 1fr 1fr，无依赖） */}
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            {/* 左：DSL 源码 */}
            <PaneCard label="SOURCE" subtitle="JSON-UI DSL" accent="oklch(0.78 0.16 230)">
              <pre className="text-foreground/85 max-h-[60vh] overflow-auto p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(doc.root, null, 2)}
              </pre>
            </PaneCard>

            {/* 中：patches 时间轴 */}
            <PaneCard
              label="EVENTS"
              subtitle={`${patches.length} patches`}
              accent="oklch(0.78 0.16 75)"
            >
              {patches.length === 0 ? (
                <div className="text-muted-foreground/60 p-3 font-mono text-[11px]">
                  （等待 patch…）
                </div>
              ) : (
                <ol className="max-h-[60vh] space-y-1 overflow-auto p-2 font-mono text-[11px]">
                  {patches.map((p) => {
                    const i = patches.indexOf(p);
                    return (
                      <li
                        key={`${p.op}-${p.path}-${i}`}
                        className={`hover:bg-foreground/[0.04] flex items-start gap-2 rounded px-2 py-1 ${
                          selectedNodePath === p.path ? "bg-foreground/[0.06]" : ""
                        }`}
                        onMouseEnter={() => setSelectedNodePath(p.path)}
                      >
                        <span className="text-muted-foreground/50 tabular-nums">
                          {String(i + 1).padStart(3, "0")}
                        </span>
                        <PatchOpChip op={p.op} />
                        <span className="text-foreground/80 truncate">{p.path}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </PaneCard>

            {/* 右：实时渲染 */}
            <PaneCard label="RENDER" subtitle="JsonUiRenderer" accent="oklch(0.78 0.16 145)">
              <div className="max-h-[60vh] overflow-auto p-3">
                <JsonUiRenderer node={doc.root as JsonUiNode} state={{}} />
              </div>
            </PaneCard>
          </div>

          {/* 底部操作栏 */}
          <div className="text-muted-foreground/70 flex items-center justify-between font-mono text-[11px]">
            <span>三栏同步：选 scenario → 触发 patch 流 → 三栏自动更新</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleStart()}
              disabled={isStreaming}
            >
              重新开始
            </Button>
          </div>
        </div>
      }
    />
  );
}

function PaneCard({
  label,
  subtitle,
  accent,
  children,
}: {
  label: string;
  subtitle?: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-card/30 border-foreground/5 overflow-hidden rounded-lg border"
      style={{ minHeight: 360 }}
    >
      <div
        className="border-foreground/5 flex items-center justify-between border-b px-3 py-1.5"
        style={{ backgroundColor: `${accent.replace(")", " / 0.05)")}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span className="text-foreground/85 font-mono text-[10px] font-medium tracking-wider uppercase">
            {label}
          </span>
        </div>
        {subtitle ? (
          <span className="text-muted-foreground/65 font-mono text-[10px]">{subtitle}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function PatchOpChip({ op }: { op: JsonUiPatch["op"] }) {
  const map = {
    mount: { color: "oklch(0.78 0.16 145)", label: "mount" },
    patch: { color: "oklch(0.78 0.16 75)", label: "patch" },
    unmount: { color: "oklch(0.78 0.16 30)", label: "unmount" },
  } as const;
  const m = map[op];
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase"
      style={{
        color: m.color,
        backgroundColor: `${m.color.replace(")", " / 0.12)")}`,
      }}
    >
      {m.label}
    </span>
  );
}
