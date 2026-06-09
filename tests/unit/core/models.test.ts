import { describe, expect, it } from "vitest";

import {
  BUILTIN_MODELS,
  BUILTIN_PROVIDERS,
  findModel,
  getModelProvider,
  getProviderById,
  type StreamChunk,
} from "@/core/models";

describe("core/models/registry", () => {
  it("BUILTIN_MODELS 至少 12 个模型", () => {
    expect(BUILTIN_MODELS.length).toBeGreaterThanOrEqual(12);
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

  it("findModel 找到已存在模型", () => {
    expect(findModel("gpt-4o-mini")?.provider).toBe("openai");
    expect(findModel("ollama:llama3.1")?.provider).toBe("ollama");
  });

  it("findModel 找不到返回 undefined", () => {
    expect(findModel("not-a-model")).toBeUndefined();
  });
});

describe("core/models/router", () => {
  it("getModelProvider 按 model id 路由", () => {
    expect(getModelProvider("gpt-4o-mini").id).toBe("openai");
    expect(getModelProvider("claude-sonnet-4-5").id).toBe("anthropic");
    expect(getModelProvider("gemini-2.5-pro").id).toBe("google");
    expect(getModelProvider("deepseek-chat").id).toBe("deepseek");
    expect(getModelProvider("qwen-max").id).toBe("qwen");
    expect(getModelProvider("ollama:llama3.1").id).toBe("ollama");
  });

  it("getModelProvider 未知 id 不抛错（mock 兜底）", () => {
    const p = getModelProvider("nonexistent-model");
    expect(p.id).toBe("openai"); // makeMockProvider("openai") 兜底
  });

  it("getProviderById 直接拿 provider", () => {
    expect(getProviderById("anthropic").id).toBe("anthropic");
  });

  it("BUILTIN_PROVIDERS 6 个 provider 都有", () => {
    for (const p of ["openai", "anthropic", "google", "deepseek", "qwen", "ollama"] as const) {
      expect(BUILTIN_PROVIDERS[p]).toBeDefined();
    }
  });
});

describe("core/models/providers mock 流式", () => {
  it("W2 mock: stream() 产出 start → text chunks → end", async () => {
    const provider = getModelProvider("gpt-4o-mini");
    const ctrl = new AbortController();
    const events: StreamChunk[] = [];

    for await (const evt of provider.stream(
      { model: "gpt-4o-mini", messages: [{ role: "user", content: "react demo" }] },
      ctrl.signal,
    )) {
      events.push(evt);
      if (evt.kind === "control" && evt.type === "end") break;
    }

    // 必须有 start
    expect(events[0]).toEqual({ kind: "control", type: "start" });
    // 中间有 text chunks
    const textChunks = events.filter((e) => e.kind === "text");
    expect(textChunks.length).toBeGreaterThan(0);
    // 末尾有 end
    const last = events[events.length - 1];
    expect(last).toMatchObject({ kind: "control", type: "end" });
    // 累计文本非空
    const totalText = textChunks.map((c) => (c as { delta: string }).delta).join("");
    expect(totalText.length).toBeGreaterThan(10);
  });

  it("W2 mock: 不同 prompt 走不同脚本", async () => {
    const provider = getModelProvider("gpt-4o-mini");
    const ctrl = new AbortController();
    const texts: string[] = [];

    for await (const evt of provider.stream(
      { model: "gpt-4o-mini", messages: [{ role: "user", content: "ag-ui" }] },
      ctrl.signal,
    )) {
      if (evt.kind === "text") texts.push(evt.delta);
      if (evt.kind === "control" && evt.type === "end") break;
    }
    expect(texts.join("")).toMatch(/AG-UI/i);
  });

  it("generate() 返回完整响应", async () => {
    const provider = getModelProvider("gpt-4o-mini");
    const ctrl = new AbortController();
    const resp = await provider.generate(
      { model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] },
      ctrl.signal,
    );
    expect(resp.content.length).toBeGreaterThan(0);
    expect(resp.finishReason).toBe("stop");
    expect(resp.usage?.totalTokens).toBeGreaterThan(0);
  });

  it("abort signal 立即中断", async () => {
    const provider = getModelProvider("gpt-4o-mini");
    const ctrl = new AbortController();
    let count = 0;

    // 立即 abort
    setTimeout(() => ctrl.abort(), 5);

    try {
      for await (const _evt of provider.stream(
        { model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] },
        ctrl.signal,
      )) {
        count++;
      }
    } catch {
      // 预期 abort 异常
    }
    // abort 后流应该在中途断开
    expect(count).toBeLessThan(100);
  });
});
