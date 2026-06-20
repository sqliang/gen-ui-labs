"use client";

import { useEffect, useRef, useState } from "react";

import {
  Field,
  LabContentPage,
  PresetChips,
  SourceToggle,
  StatusPill,
  TextInput,
} from "@/components/lab-content-page";
import type { RenderableEvent } from "@/core/protocols/common/types";
import { extractMetricsFromChunks } from "@/core/render/extract-metrics";
import { MarkdownRenderer } from "@/core/render/markdown-renderer";
import { useObservabilityStore } from "@/core/state/observability-store";
import { useSessionStore } from "@/core/state/session-store";
import { useStreamingStore } from "@/core/state/streaming-store";
import { fetchSse } from "@/infra/http/sse-client";

/** 数据源：mock（本地 setTimeout）/ api（真 /api/chat SSE） */
type StreamSource = "mock" | "api";

interface PromptPreset {
  label: string;
  prompt: string;
}

const PROMPT_PRESETS: PromptPreset[] = [
  { label: "react demo", prompt: "react demo" },
  { label: "ag-ui", prompt: "ag-ui" },
  { label: "a2ui", prompt: "a2ui" },
  { label: "json-ui", prompt: "json-ui" },
];

/**
 * Lab 1.1.1 Markdown 流式渲染。
 *
 * 行为：
 * - source=mock：本地 setTimeout 模拟（不需要任何 API key）
 * - source=api：真 fetch /api/chat SSE（带 AbortController + Zod 校验过的 meta chunk）
 */
export default function MarkdownStreamingPage() {
  const { accumulatedText, isStreaming, start, append, finish, reset, chunks } =
    useStreamingStore();
  const currentModelId = useSessionStore((s) => s.currentModelId);
  const addTokenUsage = useObservabilityStore((s) => s.addTokenUsage);

  const [source, setSource] = useState<StreamSource>("mock");
  const [activePreset, setActivePreset] = useState<string>(PROMPT_PRESETS[0]?.label ?? "");
  const [customPrompt, setCustomPrompt] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      reset();
    };
  }, [reset]);

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
          continue;
        }

        if (chunk.kind === "control" && chunk.type === "meta" && chunk.meta) {
          append(chunk);
          continue;
        }

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
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
        append({ kind: "control", type: "error", meta: { message: msg } });
      }
    } finally {
      finish();
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

  const charCount = accumulatedText.length;
  const chunkCount = chunks.length;
  const firstTokenLatency = extractMetricsFromChunks(chunks).firstTokenLatencyMs;

  const toolbar = (
    <div className="space-y-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Field
          label="数据源"
          hint={
            source === "mock"
              ? "本地 setTimeout 模拟（无需 API Key）"
              : "真 /api/chat SSE（需 provider 有 key）"
          }
        >
          <SourceToggle
            value={source}
            onChange={setSource}
            disabled={isStreaming}
            options={[
              { label: "mock", value: "mock" },
              { label: "api", value: "api" },
            ]}
          />
        </Field>
      </div>
      <div className="space-y-2">
        <span className="text-muted-foreground/70 font-mono text-[11px] uppercase tracking-wider">
          prompt preset
        </span>
        <PresetChips
          value={activePreset}
          onChange={(v) => {
            setActivePreset(v);
            setCustomPrompt("");
          }}
          disabled={isStreaming}
          options={PROMPT_PRESETS.map((p) => ({ label: p.label, value: p.label }))}
        />
      </div>
      <TextInput
        value={customPrompt}
        onChange={setCustomPrompt}
        placeholder="自定义 prompt（覆盖上方 preset）"
        disabled={isStreaming}
      />
    </div>
  );

  return (
    <LabContentPage
      labId="streaming"
      subNumber="1.1.1"
      title="Markdown 流式渲染"
      protocolLabel="W4 · Markdown 协议"
      description="基于 react-markdown + GFM + 代码高亮。支持 mock/api 双源切换，AbortController 中断，observability 指标自动落库。"
      status={
        <div className="flex items-center gap-1.5">
          <StatusPill label={currentModelId} tone="accent" />
        </div>
      }
      isStreaming={isStreaming}
      errorMsg={errorMsg}
      onStart={handleStart}
      onStop={handleStop}
      onReset={reset}
      toolbar={toolbar}
      outputTitle="rendered output"
      outputEmpty={!accumulatedText}
      outputEmptyHint={
        <p className="text-muted-foreground/70 font-mono text-[12px]">
          （点击「开始流式渲染」从 <span className="text-foreground/80">{source}</span> 拉取 →
          这里会出现 Markdown 渲染结果）
        </p>
      }
      outputExtra={
        <>
          <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
            {charCount} chars
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
            {chunkCount} chunks
          </span>
          {firstTokenLatency !== undefined ? (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-mono text-[10px] tabular-nums text-emerald-300">
                first token {firstTokenLatency}ms
              </span>
            </>
          ) : null}
        </>
      }
      output={
        accumulatedText ? (
          <MarkdownRenderer source={accumulatedText} isStreaming={isStreaming} />
        ) : null
      }
    />
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
      "## AG-UI 协议",
      "",
      "**W4 落地**：typed event 流（`TEXT_MESSAGE_CONTENT` / `TOOL_CALL_START` / `STATE_DELTA`）。",
      "切换到 **api** + `deepseek-chat` 试真流 →",
      "",
      "```ts",
      "aguiAdapter.adapt(rawEvent) → RenderableEvent",
      "// 然后 streaming-store.append(chunks)",
      "```",
      "",
      "完整 demo 见 **1.1.2 AG-UI 协议流式**。",
    ].join("\n");
  }
  if (/a2ui/i.test(prompt)) {
    return [
      "## A2UI 协议",
      "",
      "**W5 落地**：`surfaceUpdate` 声明组件树 + `dataModelUpdate` 增量更新数据。",
      "",
      "- A2UI v0.2 规范解析",
      "- `a2uiAdapter` 映射到 RenderableEvent",
      "- `/api/a2ui` mock SSE 端点",
      "",
      "完整 demo 见 **1.1.3 A2UI 协议流式**。",
    ].join("\n");
  }
  if (/json-ui|dsl/i.test(prompt)) {
    return [
      "## JSON-UI DSL",
      "",
      "**W6 落地**：声明式 JSON 树 → React 递归渲染。",
      "",
      "- 8 类节点（card / table / button / text / flex / grid / chart / input）",
      "- `/api/json-ui` SSE patch 流",
      "- `JsonUiRenderer` 在 **2.1.2 JSON-UI DSL** 完整可跑",
      "",
      "切到 **api** 模式可看增量 build 过程。",
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
