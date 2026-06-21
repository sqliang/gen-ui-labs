"use client";

import {
  FastForward,
  History,
  Pause,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LabContentPage, StatusPill } from "@/components/lab-content-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyJsonUiPatch } from "@/core/engine/json-ui/apply";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument, JsonUiNode, JsonUiPatch } from "@/core/engine/json-ui/types";
import { fetchSse } from "@/infra/http/sse-client";
import { cn } from "@/lib/utils";

/**
 * Lab 3.1.4 — 离线 Replay（真功能）
 *
 * 流程：
 * 1. 加载一组 patch events（mock + 真实 /api/json-ui 任选）
 * 2. 用 applyJsonUiPatch 累积应用前 i 个 events，得到当前 cursor 的 doc
 * 3. JsonUiRenderer 实时渲染 doc
 * 4. 用户可 scrubber / play / pause / step back / step forward / speed
 * 5. 导出：把 events 序列 + 起始 doc 序列化为 JSON 下载
 * 6. 导入：拖入 JSON 文件恢复
 *
 * 为什么重要：可重现 bug —— 把 session dump 分享给开发者，他能完整看到
 * 渲染过程（与 live 跑一样）。
 */

const INITIAL_DOC: JsonUiDocument = {
  root: { type: "text", props: { content: "等待…" } },
};

type Speed = 0.5 | 1 | 2 | 4;

const SPEEDS: Speed[] = [0.5, 1, 2, 4];

type Dump = {
  version: 1;
  createdAt: number;
  initialDoc: JsonUiDocument;
  patches: JsonUiPatch[];
};

export default function WorkbenchReplayPage() {
  const [patches, setPatches] = useState<JsonUiPatch[]>([]);
  const [initialDoc] = useState<JsonUiDocument>(INITIAL_DOC);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [source, setSource] = useState<"mock" | "api">("mock");
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 当前 doc：apply 前 cursor 个 patches 到 initialDoc
  const currentDoc = useMemo(() => {
    let cur = initialDoc;
    for (let i = 0; i < cursor; i++) {
      const p = patches[i];
      if (p) cur = applyJsonUiPatch(cur, p);
    }
    return cur;
  }, [initialDoc, patches, cursor]);

  // play loop: 500ms * (1/speed) 推进 cursor
  useEffect(() => {
    if (!isPlaying) return;
    if (cursor >= patches.length) {
      setIsPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      setCursor((c) => Math.min(c + 1, patches.length));
    }, 500 / speed);
    return () => clearTimeout(t);
  }, [isPlaying, cursor, patches.length, speed]);

  const handleLoad = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setCursor(0);
    setIsPlaying(false);
    setPatches([]);
    const acc: JsonUiPatch[] = [];
    try {
      if (source === "api") {
        for await (const evt of fetchSse("/api/json-ui", { body: { scenario: "default" } })) {
          try {
            const p = JSON.parse(evt.data) as JsonUiPatch;
            if (p && typeof p === "object" && "op" in p && "path" in p) {
              acc.push(p);
              setPatches([...acc]);
            }
          } catch {
            // ignore malformed
          }
        }
      } else {
        // mock: 直接生成 12 个 patch
        const initial: JsonUiPatch[] = [
          { op: "mount", path: "/root", value: { type: "card", props: { title: "Replay Demo" } } },
          {
            op: "mount",
            path: "/root/children/0",
            value: { type: "text", props: { content: "事件 1: mount card" } },
          },
          { op: "patch", path: "/root", value: { props: { title: "Replay Demo · mock" } } },
          { op: "mount", path: "/root/children/1", value: { type: "flex" } },
          {
            op: "mount",
            path: "/root/children/1/children/0",
            value: { type: "button", props: { label: "A" } },
          },
          {
            op: "mount",
            path: "/root/children/1/children/1",
            value: { type: "button", props: { label: "B", variant: "outline" } },
          },
          {
            op: "mount",
            path: "/root/children/2",
            value: { type: "text", props: { content: "事件 7: 加分隔" } },
          },
          {
            op: "mount",
            path: "/root/children/3",
            value: { type: "table", props: { columns: ["k", "v"], rows: [["测试", "✓"]] } },
          },
          {
            op: "patch",
            path: "/root/children/3",
            value: { props: { columns: ["k", "v", "s"], rows: [["测试", "✓", "120ms"]] } },
          },
          {
            op: "patch",
            path: "/root/children/0",
            value: { props: { content: "事件 10: text 改值" } },
          },
          { op: "patch", path: "/root", value: { props: { title: "Replay Demo · final" } } },
          {
            op: "mount",
            path: "/root/children/4",
            value: { type: "text", props: { content: "事件 12: 终态" } },
          },
        ];
        for (const p of initial) {
          await new Promise((r) => setTimeout(r, 30));
          acc.push(p);
          setPatches([...acc]);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [source]);

  // 自动加载一次
  const initialSourceRef = useRef(source);
  const initialLoadRef = useRef<() => Promise<void>>(async () => {});
  const handleInitialLoad = useCallback(async () => {
    setSource(initialSourceRef.current);
    await handleLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleLoad]);
  initialLoadRef.current = handleInitialLoad;
  useEffect(() => {
    void initialLoadRef.current();
  }, []);

  // scrubber drag
  const onScrubber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setCursor(v);
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCursor(0);
    setIsPlaying(false);
  };

  const handleExport = () => {
    const dump: Dump = {
      version: 1,
      createdAt: Date.now(),
      initialDoc,
      patches,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `genui-replay-${dump.createdAt}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dump = JSON.parse(String(reader.result)) as Dump;
        if (dump.version !== 1) {
          setErrorMsg(`unsupported dump version: ${dump.version}`);
          return;
        }
        setPatches(dump.patches);
        setCursor(0);
        setIsPlaying(false);
        setErrorMsg(null);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    };
    reader.readAsText(file);
  };

  const currentPatch = cursor > 0 ? patches[cursor - 1] : null;
  const totalCount = patches.length;
  const progressPct = totalCount > 0 ? (cursor / totalCount) * 100 : 0;

  return (
    <LabContentPage
      labId="workbench"
      subNumber="3.1.4"
      title="离线 Replay"
      protocolLabel="W7 · replay"
      description="把 patch 序列重放：scrubber 拖动 / play / step / 速度控制。导出导入 JSON dump 分享 bug。"
      isStreaming={isLoading}
      errorMsg={errorMsg}
      onStart={handleLoad}
      onReset={handleReset}
      startLabel="重载事件"
      outputEmpty={patches.length === 0 && !isLoading}
      outputEmptyHint={
        <div className="text-muted-foreground/70 py-10 text-center font-mono text-[12px]">
          {source === "mock" ? "加载 mock 12 个 patch" : "从 /api/json-ui 拉"}…
        </div>
      }
      outputExtra={
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <StatusPill
            label={`${cursor}/${totalCount}`}
            tone={cursor === totalCount ? "success" : "muted"}
          />
          {isPlaying ? <StatusPill label={`▶ ${speed}x`} tone="accent" /> : null}
          {currentPatch ? (
            <StatusPill
              label={`last: ${currentPatch.op}`}
              tone={currentPatch.op === "mount" ? "success" : "muted"}
            />
          ) : null}
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              source
            </span>
            <div className="flex gap-1">
              {(["mock", "api"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSource(s)}
                  className={cn(
                    "rounded border px-2 py-1 font-mono text-[10.5px] transition-colors",
                    source === s
                      ? "border-foreground/30 bg-foreground/[0.08] text-foreground/95"
                      : "border-foreground/10 hover:border-foreground/30 text-muted-foreground/85",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              speed
            </span>
            <div className="flex gap-1">
              {SPEEDS.map((sp) => (
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
          {/* Scrubber */}
          <div className="bg-card/30 border-foreground/5 rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={handleReset} disabled={cursor === 0}>
                <RotateCcw className="size-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCursor((c) => Math.max(0, c - 1))}
                disabled={cursor === 0}
              >
                <StepBack className="size-3" />
              </Button>
              <Button
                size="sm"
                variant={isPlaying ? "default" : "outline"}
                onClick={() => setIsPlaying((p) => !p)}
                disabled={cursor >= totalCount}
              >
                {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
                {isPlaying ? "pause" : "play"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCursor((c) => Math.min(totalCount, c + 1))}
                disabled={cursor >= totalCount}
              >
                <StepForward className="size-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCursor(totalCount)}
                disabled={cursor >= totalCount}
              >
                <FastForward className="size-3" />
                end
              </Button>
              <div className="text-muted-foreground/85 ml-2 font-mono text-[10.5px]">
                {cursor === 0
                  ? "（初始态）"
                  : currentPatch
                    ? `event ${cursor}: ${currentPatch.op} ${currentPatch.path}`
                    : ""}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExport}>
                  export
                </Button>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-1 size-3" />
                  import
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImport}
                />
              </div>
            </div>
            {/* scrubber input */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/60 font-mono text-[9.5px]">0</span>
              <div className="relative flex-1">
                <div className="bg-foreground/10 absolute inset-0 rounded-full" />
                <div
                  className="bg-foreground/30 absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={totalCount}
                  value={cursor}
                  onChange={onScrubber}
                  className="relative w-full cursor-pointer appearance-none bg-transparent"
                  style={{ height: 16 }}
                  disabled={totalCount === 0}
                />
              </div>
              <span className="text-muted-foreground/60 font-mono text-[9.5px]">{totalCount}</span>
            </div>
          </div>

          {/* 渲染区 + 事件 log 双栏 */}
          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="bg-card/30 border-foreground/5 lg:col-span-2">
              <CardHeader className="border-foreground/5 border-b p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  <History className="mr-1.5 inline size-3" />
                  Render @ cursor={cursor}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {cursor === 0 && patches.length === 0 ? (
                  <div className="text-muted-foreground/65 py-6 text-center font-mono text-[11px]">
                    等待 events 加载…
                  </div>
                ) : (
                  <div className="border-foreground/10 rounded-md border border-dashed p-3">
                    <JsonUiRenderer
                      node={currentDoc.root as JsonUiNode}
                      state={{}}
                      onHover={setHoveredPath}
                      highlightPath={hoveredPath}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="border-foreground/5 border-b p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  Event Log
                  <span className="text-muted-foreground/70 ml-1.5 font-normal">
                    {cursor}/{totalCount} applied
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-3">
                <ol className="max-h-[60vh] space-y-0.5 overflow-auto font-mono text-[10.5px]">
                  {patches.map((p) => {
                    const i = patches.indexOf(p);
                    const applied = i < cursor;
                    const current = i === cursor - 1;
                    return (
                      <li
                        key={`${p.op}-${p.path}-${patches.length}`}
                        className={cn(
                          "flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors",
                          current
                            ? "bg-foreground/[0.07] text-foreground/95"
                            : applied
                              ? "text-muted-foreground/75"
                              : "text-muted-foreground/40",
                        )}
                        onMouseEnter={() => setCursor(i + 1)}
                      >
                        <span className="w-6 text-right tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1 text-[9px] tracking-wider uppercase",
                            p.op === "mount"
                              ? "bg-oklch(0.78-0.16-145/0.15) text-oklch(0.78-0.16-145)"
                              : p.op === "patch"
                                ? "bg-oklch(0.78-0.16-75/0.15) text-oklch(0.78-0.16-75)"
                                : "bg-oklch(0.78-0.16-30/0.15) text-oklch(0.78-0.16-30)",
                          )}
                        >
                          {p.op}
                        </span>
                        <code className="truncate">{p.path}</code>
                      </li>
                    );
                  })}
                </ol>
                {patches.length === 0 ? (
                  <div className="text-muted-foreground/55 py-6 text-center font-mono text-[10.5px]">
                    等待加载…
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      }
    />
  );
}
