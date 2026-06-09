import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatRequest } from "@/core/models";
import { OpenAICompatProvider } from "@/core/models/providers/openai-compat";
import { parseSseResponse, type SseEvent } from "@/infra/http/sse-client";

/** 构造 SSE 文本 */
function sseRaw(events: Record<string, unknown>[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
}

/** 构造一个 fetch Response 替身 */
function makeSseResponse(text: string, status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("OpenAICompatProvider — stream()", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("拆 OpenAI chunk → text events → end", async () => {
    const sseText = sseRaw([
      { choices: [{ delta: { content: "He" }, finish_reason: null }] },
      { choices: [{ delta: { content: "llo" }, finish_reason: null }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
    ]);

    globalThis.fetch = vi.fn(async () => makeSseResponse(sseText)) as typeof fetch;

    const provider = new OpenAICompatProvider({
      providerId: "openai",
      baseUrl: "https://api.test/v1",
      apiKey: "sk-test",
    });

    const events: unknown[] = [];
    for await (const evt of provider.stream(
      { model: "gpt-test", messages: [{ role: "user", content: "hi" }] } as ChatRequest,
      new AbortController().signal,
    )) {
      events.push(evt);
    }

    expect(events[0]).toEqual({ kind: "control", type: "start" });
    const texts = events
      .filter((e) => (e as { kind: string }).kind === "text")
      .map((e) => (e as { delta: string }).delta);
    expect(texts.join("")).toBe("Hello");
    expect(events[events.length - 1]).toEqual({ kind: "control", type: "end" });
  });

  it("非 200 抛 ModelProviderError", async () => {
    globalThis.fetch = vi.fn(async () => makeSseResponse("", 401)) as typeof fetch;

    const provider = new OpenAICompatProvider({
      providerId: "openai",
      baseUrl: "https://api.test/v1",
      apiKey: "sk-bad",
    });

    const events: unknown[] = [];
    try {
      for await (const evt of provider.stream(
        { model: "gpt-test", messages: [{ role: "user", content: "hi" }] } as ChatRequest,
        new AbortController().signal,
      )) {
        events.push(evt);
      }
    } catch (err) {
      expect((err as Error).name).toBe("ModelProviderError");
      expect((err as { statusCode?: number }).statusCode).toBe(401);
    }
  });

  it("model id 通过 modelMap 转换", async () => {
    let capturedBody: string | undefined;
    globalThis.fetch = vi.fn(async (_url, init) => {
      capturedBody = init?.body as string;
      return makeSseResponse(
        sseRaw([{ choices: [{ delta: { content: "x" }, finish_reason: "stop" }] }]),
      );
    }) as typeof fetch;

    const provider = new OpenAICompatProvider({
      providerId: "ollama",
      baseUrl: "http://localhost:11434/v1",
      apiKey: "ollama",
      modelMap: (id) => id.replace(/^ollama:/, ""),
    });

    for await (const _evt of provider.stream(
      { model: "ollama:llama3.1", messages: [{ role: "user", content: "hi" }] } as ChatRequest,
      new AbortController().signal,
    )) {
      // consume
    }

    expect(JSON.parse(capturedBody ?? "{}").model).toBe("llama3.1");
  });

  it("finish_reason === 'length' 也正确结束", async () => {
    const sseText = sseRaw([
      { choices: [{ delta: { content: "abc" }, finish_reason: null }] },
      { choices: [{ delta: {}, finish_reason: "length" }] },
    ]);
    globalThis.fetch = vi.fn(async () => makeSseResponse(sseText)) as typeof fetch;

    const provider = new OpenAICompatProvider({
      providerId: "openai",
      baseUrl: "https://api.test/v1",
      apiKey: "sk-test",
    });

    const events: unknown[] = [];
    for await (const evt of provider.stream(
      { model: "gpt", messages: [{ role: "user", content: "hi" }] } as ChatRequest,
      new AbortController().signal,
    )) {
      events.push(evt);
    }

    expect(events[events.length - 1]).toEqual({ kind: "control", type: "end" });
  });
});

describe("parseSseResponse — 真实路径", () => {
  it("解析 [DONE] 行（JSON parse 失败）", async () => {
    // 模拟 OpenAI 流的最后一行
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            sseRaw([{ choices: [{ delta: { content: "x" }, finish_reason: "stop" }] }]) +
              "data: [DONE]\n\n",
          ),
        );
        controller.close();
      },
    });

    const events: SseEvent[] = [];
    for await (const evt of parseSseResponse(
      new Response(body, { status: 200 }),
      new AbortController().signal,
    )) {
      events.push(evt);
    }
    // [DONE] 被 parse 成 data: "[DONE]"，调用方在 OpenAICompatProvider 里 catch 住
    // 这里验证能正常通过 2 条事件，不抛错
    expect(events.length).toBe(2);
    expect(events[0]?.data).toContain('"content":"x"');
    expect(events[1]?.data).toBe("[DONE]");
  });
});
