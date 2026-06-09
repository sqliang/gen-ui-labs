import { describe, expect, it } from "vitest";

import { BUILTIN_MODELS, findModel, listModelsByProvider } from "@/core/models/registry";

describe("core/models/registry", () => {
  it("BUILTIN_MODELS 至少 13 个模型", () => {
    expect(BUILTIN_MODELS.length).toBeGreaterThanOrEqual(13);
  });

  it("BUILTIN_MODELS id 唯一", () => {
    const ids = BUILTIN_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("BUILTIN_MODELS 覆盖 6 个 provider", () => {
    const providers = new Set(BUILTIN_MODELS.map((m) => m.provider));
    for (const p of ["openai", "anthropic", "google", "deepseek", "qwen", "ollama"] as const) {
      expect(providers.has(p)).toBe(true);
    }
  });

  it("每个 provider 至少 1 个模型", () => {
    const counts: Record<string, number> = {};
    for (const m of BUILTIN_MODELS) {
      counts[m.provider] = (counts[m.provider] ?? 0) + 1;
    }
    for (const [, count] of Object.entries(counts)) {
      expect(count).toBeGreaterThan(0);
    }
  });

  it("每个 model 有 contextWindow 字段", () => {
    for (const m of BUILTIN_MODELS) {
      expect(m.contextWindow).toBeGreaterThan(0);
    }
  });

  it("findModel 找到已存在模型", () => {
    expect(findModel("gpt-4o-mini")?.provider).toBe("openai");
    expect(findModel("ollama:llama3.1")?.provider).toBe("ollama");
  });

  it("findModel 找不到返回 undefined", () => {
    expect(findModel("not-a-model")).toBeUndefined();
  });

  it("listModelsByProvider 按 provider 过滤", () => {
    const openai = listModelsByProvider("openai");
    expect(openai.length).toBeGreaterThan(0);
    for (const m of openai) {
      expect(m.provider).toBe("openai");
    }
  });
});
