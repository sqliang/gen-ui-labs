import { beforeEach, describe, expect, it } from "vitest";

import { useObservabilityStore } from "@/core/state/observability-store";

describe("observability-store", () => {
  beforeEach(() => {
    useObservabilityStore.getState().reset();
  });

  it("默认状态正确", () => {
    const s = useObservabilityStore.getState();
    expect(s.tokenUsageByModel).toEqual({});
    expect(s.toolCalls).toEqual([]);
    expect(s.reasoning).toEqual([]);
    expect(s.agentPattern).toBe("react");
    expect(s.isRecording).toBe(false);
  });

  it("startRecording 清空所有累计并打开标志", () => {
    useObservabilityStore.getState().addToolCall({
      id: "t1",
      name: "render",
      args: {},
      startedAt: Date.now(),
    });
    useObservabilityStore.getState().startRecording();
    const s = useObservabilityStore.getState();
    expect(s.isRecording).toBe(true);
    expect(s.toolCalls).toEqual([]);
    expect(s.tokenUsageByModel).toEqual({});
    expect(s.reasoning).toEqual([]);
  });

  it("addTokenUsage 按 model 累加", () => {
    const store = useObservabilityStore.getState();
    store.addTokenUsage("gpt-4o-mini", { prompt: 10, completion: 20, total: 30 });
    store.addTokenUsage("gpt-4o-mini", { prompt: 5, completion: 15, total: 20 });
    store.addTokenUsage("claude-sonnet-4-5", { prompt: 100, completion: 200, total: 300 });
    const s = useObservabilityStore.getState();
    expect(s.tokenUsageByModel["gpt-4o-mini"]).toEqual({
      prompt: 15,
      completion: 35,
      total: 50,
    });
    expect(s.tokenUsageByModel["claude-sonnet-4-5"]).toEqual({
      prompt: 100,
      completion: 200,
      total: 300,
    });
  });

  it("addTokenUsage 保留首 token 延迟（仅首次）", () => {
    const store = useObservabilityStore.getState();
    store.addTokenUsage("gpt-4o", {
      prompt: 0,
      completion: 0,
      total: 0,
      firstTokenLatencyMs: 250,
    });
    store.addTokenUsage("gpt-4o", { prompt: 10, completion: 20, total: 30 });
    expect(useObservabilityStore.getState().tokenUsageByModel["gpt-4o"]?.firstTokenLatencyMs).toBe(
      250,
    );
  });

  it("addToolCall + updateToolCall", () => {
    const store = useObservabilityStore.getState();
    const id = "tc-1";
    store.addToolCall({ id, name: "render", args: { x: 1 }, startedAt: Date.now() });
    store.updateToolCall(id, { durationMs: 42, result: { ok: true } });
    const call = useObservabilityStore.getState().toolCalls[0];
    expect(call).toBeDefined();
    expect(call?.durationMs).toBe(42);
    expect(call?.result).toEqual({ ok: true });
  });

  it("addReasoning 累加", () => {
    const store = useObservabilityStore.getState();
    store.addReasoning({ id: "s1", type: "think", content: "思考", timestamp: Date.now() });
    store.addReasoning({ id: "s2", type: "act", content: "执行", timestamp: Date.now() });
    expect(useObservabilityStore.getState().reasoning.length).toBe(2);
  });

  it("setPattern 切换模式", () => {
    useObservabilityStore.getState().setPattern("plan-execute");
    expect(useObservabilityStore.getState().agentPattern).toBe("plan-execute");
  });
});
