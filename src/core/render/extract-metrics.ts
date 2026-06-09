import type { RenderableEvent } from "@/core/protocols/common/types";

/**
 * 从一串 RenderableEvent 里提取 observability 指标。
 *
 * - firstTokenLatencyMs: 第一个 text chunk 出现时的 meta chunk
 * - totalDurationMs: 最后一个 meta chunk
 *
 * 跟 /api/chat 路由约定：meta chunk 是 `{kind: "control", type: "meta", meta: {...}}`。
 */
export function extractMetricsFromChunks(chunks: RenderableEvent[]): {
  firstTokenLatencyMs?: number;
  totalDurationMs?: number;
} {
  let firstTokenLatencyMs: number | undefined;
  let totalDurationMs: number | undefined;

  for (const chunk of chunks) {
    if (chunk.kind === "control" && chunk.type === "meta" && chunk.meta) {
      const m = chunk.meta as { firstTokenLatencyMs?: number; totalDurationMs?: number };
      if (typeof m.firstTokenLatencyMs === "number" && firstTokenLatencyMs === undefined) {
        firstTokenLatencyMs = m.firstTokenLatencyMs;
      }
      if (typeof m.totalDurationMs === "number") {
        totalDurationMs = m.totalDurationMs; // 末尾 meta 会覆盖（多次出现时取最后）
      }
    }
  }

  return { firstTokenLatencyMs, totalDurationMs };
}
