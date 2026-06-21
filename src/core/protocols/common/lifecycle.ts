import type { EnrichedRenderableEvent, EventMeta, RenderableEvent } from "./types";

/**
 * Run-level metadata — 整个流式 session 的不变量。
 *
 * seq 是 run 内严格递增序号；sessionId 唯一标识一次 run。
 */
export interface RunMeta {
  sessionId: string;
  startedAt: number;
  source: EventMeta["source"];
}

/**
 * 创建一次新 run。
 *
 * sessionId 用稳定 hash：`model|prompt|first4(startTime)` 的 djb2 hash。
 * 之所以需要稳定：observability page 加载同样的 run 时能识别是同一个。
 */
export function createRunMeta(opts: {
  source: EventMeta["source"];
  model?: string;
  prompt?: string;
  startedAt?: number;
}): RunMeta {
  const startedAt = opts.startedAt ?? Date.now();
  const sessionId = hashStr(
    `${opts.model ?? "default"}|${opts.prompt ?? "default"}|${String(startedAt).slice(0, 4)}`,
  );
  return { sessionId, startedAt, source: opts.source };
}

/**
 * 把一条 RenderableEvent 包成 EnrichedRenderableEvent。
 *
 * 纯函数 —— 多次调用同样的 input + 同样的 runMeta.seq 输出同样的 enriched。
 * 用 closure 维持当前 seq（不要在 render 中调用）。
 */
export function makeEnricher(run: RunMeta) {
  let seq = 0;
  return (event: RenderableEvent): EnrichedRenderableEvent => {
    const enriched: EnrichedRenderableEvent = {
      ...event,
      _meta: {
        seq: seq++,
        ts: Date.now(),
        sessionId: run.sessionId,
        source: run.source,
      },
    };
    return enriched;
  };
}

/**
 * 给一组事件批量加 meta（保持输入顺序）。
 */
export function enrichAll(events: RenderableEvent[], run: RunMeta): EnrichedRenderableEvent[] {
  const enrich = makeEnricher(run);
  return events.map(enrich);
}

/**
 * djb2 string hash —— 比 crypto.subtle 快，避免在 hot path 调用。
 * 输出 8 hex chars (32-bit)，够 sessionId 去重。
 */
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  // 转无符号 32-bit hex
  return (h >>> 0).toString(16).padStart(8, "0");
}
