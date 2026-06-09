import { beforeEach, describe, expect, it } from "vitest";

import { BUILTIN_MODELS, useSessionStore } from "@/core/state/session-store";

describe("session-store", () => {
  beforeEach(() => {
    useSessionStore.setState({
      currentSessionId: null,
      currentModelId: "gpt-4o-mini",
      currentLab: null,
    });
  });

  it("默认状态正确", () => {
    const s = useSessionStore.getState();
    expect(s.currentSessionId).toBe(null);
    expect(s.currentModelId).toBe("gpt-4o-mini");
    expect(s.currentLab).toBe(null);
  });

  it("setCurrentSession 修改 id", () => {
    useSessionStore.getState().setCurrentSession("abc-123");
    expect(useSessionStore.getState().currentSessionId).toBe("abc-123");
  });

  it("setCurrentModel 修改 model", () => {
    useSessionStore.getState().setCurrentModel("claude-sonnet-4-5");
    expect(useSessionStore.getState().currentModelId).toBe("claude-sonnet-4-5");
  });

  it("setCurrentLab 修改 lab", () => {
    useSessionStore.getState().setCurrentLab("workbench");
    expect(useSessionStore.getState().currentLab).toBe("workbench");
  });

  it("BUILTIN_MODELS 至少包含 6 个 provider", () => {
    const providers = new Set(BUILTIN_MODELS.map((m) => m.provider));
    expect(providers.size).toBeGreaterThanOrEqual(6);
  });

  it("BUILTIN_MODELS 每个 provider 至少 1 个模型", () => {
    const counts = BUILTIN_MODELS.reduce<Record<string, number>>((acc, m) => {
      acc[m.provider] = (acc[m.provider] ?? 0) + 1;
      return acc;
    }, {});
    for (const [, count] of Object.entries(counts)) {
      expect(count).toBeGreaterThan(0);
    }
  });
});
