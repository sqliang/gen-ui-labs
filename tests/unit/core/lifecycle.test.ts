import { describe, expect, it } from "vitest";

import { createRunMeta, enrichAll, makeEnricher } from "@/core/protocols/common/lifecycle";
import type { EnrichedRenderableEvent, RenderableEvent } from "@/core/protocols/common/types";

describe("protocols/common/lifecycle", () => {
  describe("createRunMeta", () => {
    it("生成 8 hex chars 的 sessionId", () => {
      const m = createRunMeta({ source: "mock" });
      expect(m.sessionId).toMatch(/^[0-9a-f]{8}$/);
    });

    it("相同 model/prompt/startTime → 相同 sessionId（稳定）", () => {
      const startedAt = 1749993600000;
      const a = createRunMeta({
        source: "mock",
        model: "deepseek-chat",
        prompt: "react demo",
        startedAt,
      });
      const b = createRunMeta({
        source: "mock",
        model: "deepseek-chat",
        prompt: "react demo",
        startedAt,
      });
      expect(a.sessionId).toBe(b.sessionId);
    });

    it("不同 prompt → 不同 sessionId", () => {
      const m = createRunMeta({ source: "mock", prompt: "ag-ui" });
      const n = createRunMeta({ source: "mock", prompt: "a2ui" });
      expect(m.sessionId).not.toBe(n.sessionId);
    });

    it("source 字段透传", () => {
      const m = createRunMeta({ source: "api" });
      expect(m.source).toBe("api");
    });
  });

  describe("makeEnricher", () => {
    it("给事件加 _meta，seq 从 0 起", () => {
      const run = createRunMeta({ source: "mock", model: "t", prompt: "p" });
      const enrich = makeEnricher(run);
      const ev: RenderableEvent = { kind: "text", delta: "hello" };
      const out = enrich(ev);
      expect(out._meta.seq).toBe(0);
      expect(out._meta.sessionId).toBe(run.sessionId);
      expect(out._meta.source).toBe("mock");
    });

    it("多次调用 seq 严格递增", () => {
      const run = createRunMeta({ source: "mock", model: "t", prompt: "p" });
      const enrich = makeEnricher(run);
      const a = enrich({ kind: "text", delta: "a" });
      const b = enrich({ kind: "text", delta: "b" });
      const c = enrich({ kind: "text", delta: "c" });
      expect(a._meta.seq).toBe(0);
      expect(b._meta.seq).toBe(1);
      expect(c._meta.seq).toBe(2);
    });

    it("原始字段保留（不破坏 RenderableEvent 结构）", () => {
      const run = createRunMeta({ source: "mock", model: "t", prompt: "p" });
      const enrich = makeEnricher(run);
      const out = enrich({ kind: "tool", name: "search", args: { q: "x" } });
      expect(out.kind).toBe("tool");
      // _meta 不破坏原始 discriminated union
      expect("_meta" in out).toBe(true);
      // 用 RenderableEvent 类型断言保留 type narrowing
      const asEv = out as Extract<RenderableEvent, { kind: "tool" }> & {
        _meta: typeof out._meta;
      };
      expect(asEv.name).toBe("search");
      expect(asEv.args).toEqual({ q: "x" });
    });

    it("ts 是 number 且递增", () => {
      const run = createRunMeta({ source: "mock", model: "t", prompt: "p" });
      const enrich = makeEnricher(run);
      const a = enrich({ kind: "text", delta: "x" });
      // 让时间过至少 1ms
      const before = Date.now();
      while (Date.now() === before) {
        // busy-wait 1ms
      }
      const b = enrich({ kind: "text", delta: "y" });
      expect(typeof a._meta.ts).toBe("number");
      expect(b._meta.ts).toBeGreaterThanOrEqual(a._meta.ts);
    });

    it("两个独立 enricher 各自从 0 开始（seq 是 closure 内局部）", () => {
      const run = createRunMeta({ source: "mock", model: "t", prompt: "p" });
      const a = makeEnricher(run)({ kind: "text", delta: "x" });
      const b = makeEnricher(run)({ kind: "text", delta: "y" });
      expect(a._meta.seq).toBe(0);
      expect(b._meta.seq).toBe(0);
    });
  });

  describe("enrichAll", () => {
    it("批量包装保持顺序 + seq 连续", () => {
      const events: RenderableEvent[] = [
        { kind: "text", delta: "a" },
        { kind: "control", type: "start" },
        { kind: "text", delta: "b" },
      ];
      const run = createRunMeta({ source: "api" });
      const out = enrichAll(events, run);
      expect(out).toHaveLength(3);
      expect(out[0]?._meta.seq).toBe(0);
      expect(out[1]?._meta.seq).toBe(1);
      expect(out[2]?._meta.seq).toBe(2);
      expect(out.every((e) => e._meta.sessionId === run.sessionId)).toBe(true);
    });

    it("空数组返回空", () => {
      const out = enrichAll([], createRunMeta({ source: "mock" }));
      expect(out).toEqual([]);
    });
  });

  describe("EnrichedRenderableEvent 类型", () => {
    it("编译时验证 _meta 必填（通过 type test）", () => {
      const ev: EnrichedRenderableEvent = {
        kind: "text",
        delta: "hi",
        _meta: { seq: 0, ts: 1, sessionId: "abc", source: "mock" },
      };
      expect(ev._meta.sessionId).toBe("abc");
    });
  });
});
