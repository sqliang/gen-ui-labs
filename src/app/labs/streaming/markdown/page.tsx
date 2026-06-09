"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractMetricsFromChunks } from "@/core/render/extract-metrics";
import { MarkdownRenderer } from "@/core/render/markdown-renderer";
import { useObservabilityStore } from "@/core/state/observability-store";
import { useSessionStore } from "@/core/state/session-store";
import { type RenderableEvent, useStreamingStore } from "@/core/state/streaming-store";
import { fetchSse } from "@/infra/http/sse-client";
import { cn } from "@/lib/utils";

/** 数据源：mock（本地 setTimeout）/ api（真 /api/chat SSE） */
type StreamSource = "mock" | "api";

interface PromptPreset {
  /** 显示名 */
  label: string;
  /** 真实 prompt 内容（也作为 mock 关键词匹配） */
  prompt: string;
}

const PROMPT_PRESETS: PromptPreset[] = [
  { label: "react demo", prompt: "react demo" },
  { label: "ag-ui", prompt: "ag-ui" },
  { label: "a2ui", prompt: "a2ui" },
  { label: "json-ui", prompt: "json-ui" },
];

/**
 * Lab 1.1.1 Markdown 流式渲染（W4-4 升级）。
 *
 * 行为：
 * - source=mock：本地 setTimeout 模拟（不需要任何 API key；走 streaming-store 直接拼文本）
 * - source=api：真 fetch /api/chat SSE（带 AbortController + Zod 校验过的 meta chunk）
 *
 * Observability：
 * - api 模式下，每次成功的流都会把 firstTokenLatencyMs / totalDurationMs
 *   通过 observability-store.addTokenUsage 记录到当前 model
 *
 * 协议层：当前是纯 Markdown 协议。AG-UI / A2UI / JSON-UI 的"协议 + 组件 + 数据"
 * 转换留 W4-3（core/protocols/common/ 落）。
 */
export default function MarkdownStreamingPage() {
  // --- store subscriptions ---
  const { accumulatedText, isStreaming, start, append, finish, reset, chunks } =
    useStreamingStore();
  const currentModelId = useSessionStore((s) => s.currentModelId);
  const addTokenUsage = useObservabilityStore((s) => s.addTokenUsage);

  // --- local state ---
  const [source, setSource] = useState<StreamSource>("mock");
  const [activePreset, setActivePreset] = useState<string>(PROMPT_PRESETS[0]?.label ?? "");
  const [customPrompt, setCustomPrompt] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- refs（不让 React 重渲拿到 AbortController）---
  const abortRef = useRef<AbortController | null>(null);

  // 卸载时取消 in-flight + 清空
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      reset();
    };
  }, [reset]);

  /**
   * Mock 模式：本地 setTimeout 推 chunk。
   * 不走 SSE 客户端，只调 streaming-store.append，
   * 等于测的是"store + renderer"本身。
   */
  const runMock = async (prompt: string) => {
    start("markdown");
    setErrorMsg(null);

    const sample = mockTextFor(prompt);
    for (let i = 0; i < sample.length; i += 8) {
      if (abortRef.current?.signal.aborted) return;
      const delta = sample.slice(i, i + 8);
      append({ kind: "text", delta });
      await new Promise((r) => setTimeout(r, 30));
    }
    append({ kind: "control", type: "end" });
    finish();
  };

  /**
   * API 模式：真 fetch /api/chat SSE。
   * 处理：
   * - start: meta chunk 记录 firstTokenLatencyMs
   * - text: append 累文本
   * - end / error: 收尾；成功则落 totalDurationMs + addTokenUsage
   */
  const runApi = async (prompt: string) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setErrorMsg(null);
    start("markdown");

    try {
      for await (const evt of fetchSse("/api/chat", {
        body: { model: currentModelId, messages: [{ role: "user", content: prompt }] },
        signal: ctrl.signal,
      })) {
        if (ctrl.signal.aborted) break;

        let chunk: RenderableEvent;
        try {
          chunk = JSON.parse(evt.data) as RenderableEvent;
        } catch {
          // 跳过非 JSON 行（[DONE] 等）
          continue;
        }

        // 抓 meta（firstTokenLatency / totalDuration）
        if (chunk.kind === "control" && chunk.type === "meta" && chunk.meta) {
          // meta 也 append 进 streaming-store（重放/导出时完整）
          append(chunk);
          continue;
        }

        // 错误
        if (chunk.kind === "control" && chunk.type === "error") {
          const meta = (chunk.meta ?? {}) as { message?: string; aborted?: boolean };
          if (!meta.aborted) {
            setErrorMsg(meta.message ?? "Unknown error");
          }
        }

        append(chunk);

        if (chunk.kind === "control" && chunk.type === "end") break;
      }
    } catch (err) {
      // abort 是预期，吞掉
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
        append({ kind: "control", type: "error", meta: { message: msg } });
      }
    } finally {
      finish();
      // 从 streaming-store 拿瞬时 chunks 算指标，落 observability
      // （用 getState() 避免订阅 chunks 触发重渲）
      const allChunks = useStreamingStore.getState().chunks;
      const metrics = extractMetricsFromChunks(allChunks);
      if (metrics.firstTokenLatencyMs !== undefined) {
        addTokenUsage(currentModelId, {
          prompt: 0,
          completion: 0,
          total: 0,
          firstTokenLatencyMs: metrics.firstTokenLatencyMs,
        });
      }
      abortRef.current = null;
    }
  };

  const handleStart = async () => {
    const prompt = customPrompt.trim() || activePreset || "";
    if (!prompt) return;
    reset();
    setErrorMsg(null);
    if (source === "mock") {
      await runMock(prompt);
    } else {
      await runApi(prompt);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    finish();
  };

  // 派生 UI 状态
  const charCount = accumulatedText.length;
  const chunkCount = chunks.length;
  const firstTokenLatency = extractMetricsFromChunks(chunks).firstTokenLatencyMs;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">1.1.1 Markdown 流式渲染</h1>
          <Badge variant="outline">W4-4 · Markdown 协议</Badge>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {currentModelId}
          </Badge>
          {isStreaming ? (
            <Badge variant="default" className="font-mono text-[10px]">
              streaming…
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          流式 source：<code className="text-foreground">{source}</code> ·
          {charCount > 0 ? ` ${charCount} 字符` : " 空"}
          {chunkCount > 0 ? ` · ${chunkCount} chunks` : ""}
        </p>
      </header>

      {/* source 切换 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-muted-foreground text-xs">数据源</span>
        <SourceToggle value={source} onChange={setSource} disabled={isStreaming} />
        <span className="text-muted-foreground ml-3 text-[11px]">
          {source === "mock"
            ? "本地 setTimeout 模拟（无需 API Key）"
            : "真 /api/chat SSE（需 provider 有 key）"}
        </span>
      </div>

      {/* preset + 自定义 prompt */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          {PROMPT_PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant={activePreset === p.label ? "default" : "outline"}
              onClick={() => {
                setActivePreset(p.label);
                setCustomPrompt("");
              }}
              disabled={isStreaming}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="自定义 prompt（覆盖上方 preset）"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2"
          disabled={isStreaming}
        />
      </div>

      <div className="mb-4 flex gap-2">
        <Button onClick={handleStart} disabled={isStreaming}>
          {isStreaming ? "渲染中…" : "开始流式渲染"}
        </Button>
        <Button onClick={handleStop} variant="outline" disabled={!isStreaming}>
          停止
        </Button>
        <Button onClick={reset} variant="ghost" disabled={isStreaming}>
          清空
        </Button>
      </div>

      {errorMsg ? (
        <Card className="mb-4 border-destructive/50">
          <CardContent className="p-3 text-destructive text-sm">
            <strong>错误：</strong>
            {errorMsg}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
          <CardTitle className="text-sm">输出（rendered by react-markdown）</CardTitle>
          {isStreaming ? (
            <span className="text-muted-foreground font-mono text-[10px]">
              {charCount} 字符 / {chunkCount} chunks
              {firstTokenLatency !== undefined ? ` · 首 token ${firstTokenLatency}ms` : ""}
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {accumulatedText ? (
            <MarkdownRenderer
              source={accumulatedText}
              isStreaming={isStreaming}
              className="bg-card max-h-[32rem] overflow-auto rounded-md p-3 scrollbar-thin"
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              （点击「开始流式渲染」，从 <code>{source}</code> 拉取）
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceToggle({
  value,
  onChange,
  disabled,
}: {
  value: StreamSource;
  onChange: (v: StreamSource) => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-input inline-flex rounded-md border p-0.5">
      {(["mock", "api"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          disabled={disabled}
          className={cn(
            "rounded px-2 py-1 text-xs transition-colors disabled:opacity-50",
            value === v
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function mockTextFor(prompt: string): string {
  if (/react/i.test(prompt)) {
    return [
      "# 这是 Lab 1.1.1 Markdown 流式演示",
      "",
      "这是 **W4-4 升级版**的页面——真正接 SSE + react-markdown 渲染。",
      "",
      "## 它能做什么",
      "",
      "- 边生成边渲染（不等全部内容）",
      "- 自动处理 Markdown 语法（GFM + 代码高亮）",
      "- 支持停止 / 清空 / 切换数据源",
      "",
      "## 代码块示例",
      "",
      "```ts",
      'import { useStreamingStore } from "@/core/state/streaming-store";',
      'import { MarkdownRenderer } from "@/core/render/markdown-renderer";',
      "",
      "const { accumulatedText, isStreaming } = useStreamingStore();",
      "<MarkdownRenderer source={accumulatedText} isStreaming={isStreaming} />",
      "```",
      "",
      "> 当前 demo 在 **mock** 模式下走本地 setTimeout；切到 **api** 模式接 `/api/chat` 真 SSE。",
    ].join("\n");
  }
  if (/ag-ui/i.test(prompt)) {
    return [
      "## AG-UI 协议 placeholder",
      "",
      "W4-3 会在 `core/protocols/common/` 落地 AG-UI 事件流（`TEXT_MESSAGE_CONTENT` / `TOOL_CALL_START` 等）。",
      "",
      "Markdown 协议 ≠ AG-UI 协议；本页是 Markdown 协议专属。",
    ].join("\n");
  }
  if (/a2ui/i.test(prompt)) {
    return [
      "## A2UI 协议 placeholder",
      "",
      "W4-3 接入 A2UI v0.2 规范的 `surfaceUpdate` / `dataModelUpdate`。",
    ].join("\n");
  }
  if (/json-ui|dsl/i.test(prompt)) {
    return [
      "## JSON-UI DSL placeholder",
      "",
      "W6 落地 JSON-UI → React 引擎（`core/engine/json-ui/`）。",
    ].join("\n");
  }
  return [
    "# GenUI Labs · Markdown 流式 demo",
    "",
    `prompt: \`${prompt}\``,
    "",
    "切换到 **api** source 看真 SSE 流式（需在 `.env.local` 配置 provider API Key）。",
  ].join("\n");
}
