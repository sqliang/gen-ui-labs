import { beforeEach, describe, expect, it } from "vitest";

import { useStreamingStore } from "@/core/state/streaming-store";

describe("streaming-store", () => {
  beforeEach(() => {
    useStreamingStore.getState().reset();
  });

  it("默认状态正确", () => {
    const s = useStreamingStore.getState();
    expect(s.chunks).toEqual([]);
    expect(s.isStreaming).toBe(false);
    expect(s.protocol).toBe("markdown");
    expect(s.accumulatedText).toBe("");
  });

  it("start() 重置并标记 streaming=true", () => {
    useStreamingStore.getState().start("ag-ui");
    const s = useStreamingStore.getState();
    expect(s.protocol).toBe("ag-ui");
    expect(s.isStreaming).toBe(true);
    expect(s.chunks).toEqual([]);
    expect(s.accumulatedText).toBe("");
  });

  it("append(text) 累积文本", () => {
    useStreamingStore.getState().start("markdown");
    useStreamingStore.getState().append({ kind: "text", delta: "hello " });
    useStreamingStore.getState().append({ kind: "text", delta: "world" });
    const s = useStreamingStore.getState();
    expect(s.accumulatedText).toBe("hello world");
    expect(s.chunks.length).toBe(2);
  });

  it("append(component) 不累积到文本", () => {
    useStreamingStore.getState().start("ag-ui");
    useStreamingStore.getState().append({ kind: "component", op: "mount", id: "c1" });
    const s = useStreamingStore.getState();
    expect(s.accumulatedText).toBe("");
    expect(s.chunks.length).toBe(1);
  });

  it("finish() 关闭 streaming 标志但保留 chunks", () => {
    useStreamingStore.getState().start("markdown");
    useStreamingStore.getState().append({ kind: "text", delta: "x" });
    useStreamingStore.getState().finish();
    const s = useStreamingStore.getState();
    expect(s.isStreaming).toBe(false);
    expect(s.chunks.length).toBe(1);
    expect(s.accumulatedText).toBe("x");
  });

  it("reset() 完整清空", () => {
    useStreamingStore.getState().start("a2ui");
    useStreamingStore.getState().append({ kind: "text", delta: "abc" });
    useStreamingStore.getState().reset();
    const s = useStreamingStore.getState();
    expect(s.chunks).toEqual([]);
    expect(s.isStreaming).toBe(false);
    expect(s.protocol).toBe("markdown");
    expect(s.accumulatedText).toBe("");
  });
});
