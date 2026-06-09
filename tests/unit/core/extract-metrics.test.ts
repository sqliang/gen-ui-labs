import { describe, expect, it } from "vitest";

import { extractMetricsFromChunks } from "@/core/render/extract-metrics";
import type { RenderableEvent } from "@/core/state/streaming-store";

describe("extractMetricsFromChunks", () => {
  it("空数组返回 undefined", () => {
    expect(extractMetricsFromChunks([])).toEqual({});
  });

  it("第一个 meta chunk 拿 firstTokenLatencyMs", () => {
    const chunks: RenderableEvent[] = [
      { kind: "control", type: "start" },
      { kind: "control", type: "meta", meta: { firstTokenLatencyMs: 234 } },
      { kind: "text", delta: "He" },
      { kind: "text", delta: "llo" },
      { kind: "control", type: "meta", meta: { totalDurationMs: 1500 } },
      { kind: "control", type: "end" },
    ];
    const metrics = extractMetricsFromChunks(chunks);
    expect(metrics.firstTokenLatencyMs).toBe(234);
    expect(metrics.totalDurationMs).toBe(1500);
  });

  it("无 meta 字段时为空", () => {
    const chunks: RenderableEvent[] = [
      { kind: "control", type: "start" },
      { kind: "text", delta: "x" },
      { kind: "control", type: "end" },
    ];
    expect(extractMetricsFromChunks(chunks)).toEqual({});
  });

  it("meta 不是数字时跳过", () => {
    const chunks: RenderableEvent[] = [
      { kind: "control", type: "meta", meta: { firstTokenLatencyMs: "abc" } },
      { kind: "text", delta: "x" },
    ];
    expect(extractMetricsFromChunks(chunks)).toEqual({});
  });

  it("firstTokenLatencyMs 只取第一个（多次出现时）", () => {
    const chunks: RenderableEvent[] = [
      { kind: "control", type: "meta", meta: { firstTokenLatencyMs: 100 } },
      { kind: "text", delta: "x" },
      { kind: "control", type: "meta", meta: { firstTokenLatencyMs: 999 } },
    ];
    expect(extractMetricsFromChunks(chunks).firstTokenLatencyMs).toBe(100);
  });

  it("totalDurationMs 取最后一个（重放覆盖场景）", () => {
    const chunks: RenderableEvent[] = [
      { kind: "control", type: "meta", meta: { totalDurationMs: 100 } },
      { kind: "text", delta: "x" },
      { kind: "control", type: "meta", meta: { totalDurationMs: 999 } },
    ];
    expect(extractMetricsFromChunks(chunks).totalDurationMs).toBe(999);
  });
});
