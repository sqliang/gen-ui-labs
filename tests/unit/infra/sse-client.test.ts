import { describe, expect, it } from "vitest";

import { fetchSse, parseSseResponse } from "@/infra/http/sse-client";

function sseBody(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) controller.enqueue(encoder.encode(e));
      controller.close();
    },
  });
}

/** 构造 fetch Response 替身 */
function makeFetchResponse(body: ReadableStream<Uint8Array> | null, status = 200): Response {
  return new Response(body, { status });
}

describe("infra/http/sse-client — parseSseResponse", () => {
  it("解析单个 event", async () => {
    const body = sseBody(["data: hello\n\n"]);
    const events: { event?: string; data: string }[] = [];
    for await (const evt of parseSseResponse(
      makeFetchResponse(body),
      new AbortController().signal,
    )) {
      events.push(evt);
    }
    expect(events.length).toBe(1);
    expect(events[0]?.data).toBe("hello");
  });

  it("解析多个 event", async () => {
    const body = sseBody(["data: a\n\ndata: b\n\ndata: c\n\n"]);
    const events: { event?: string; data: string }[] = [];
    for await (const evt of parseSseResponse(
      makeFetchResponse(body),
      new AbortController().signal,
    )) {
      events.push(evt);
    }
    expect(events.map((e) => e.data)).toEqual(["a", "b", "c"]);
  });

  it("解析 event + data + id", async () => {
    const body = sseBody(["event: tick\ndata: 1\nid: 42\n\n"]);
    const events: { event?: string; data: string; id?: string }[] = [];
    for await (const evt of parseSseResponse(
      makeFetchResponse(body),
      new AbortController().signal,
    )) {
      events.push(evt);
    }
    expect(events[0]).toEqual({ event: "tick", data: "1", id: "42" });
  });

  it("data 多行用 \\n 拼接", async () => {
    const body = sseBody(["data: line1\ndata: line2\n\n"]);
    const events: { data: string }[] = [];
    for await (const evt of parseSseResponse(
      makeFetchResponse(body),
      new AbortController().signal,
    )) {
      events.push(evt);
    }
    expect(events[0]?.data).toBe("line1\nline2");
  });

  it("注释行（:）跳过", async () => {
    const body = sseBody([": comment\ndata: real\n\n"]);
    const events: { data: string }[] = [];
    for await (const evt of parseSseResponse(
      makeFetchResponse(body),
      new AbortController().signal,
    )) {
      events.push(evt);
    }
    expect(events[0]?.data).toBe("real");
  });

  it("跨 chunk 拼接（SSE 部分消息被切开）", async () => {
    // data: hello\n\n 被切成 2 块：前 5 字节 + 剩下的
    const body = sseBody(["data: he", "llo\n\n"]);
    const events: { data: string }[] = [];
    for await (const evt of parseSseResponse(
      makeFetchResponse(body),
      new AbortController().signal,
    )) {
      events.push(evt);
    }
    expect(events[0]?.data).toBe("hello");
  });

  it("非 200 抛错", async () => {
    await expect(async () => {
      for await (const _evt of parseSseResponse(
        makeFetchResponse(null, 500),
        new AbortController().signal,
      )) {
        // 不应该进入循环
      }
    }).rejects.toThrow();
  });
});

describe("infra/http/sse-client — fetchSse", () => {
  it("POST 请求带 body 和正确 headers", async () => {
    const captured: { url: string; init: RequestInit } = { url: "", init: {} };
    const fakeFetch: typeof fetch = async (url, init) => {
      captured.url = String(url);
      captured.init = init ?? {};
      return makeFetchResponse(sseBody(["data: ok\n\n"]));
    };

    const events: { data: string }[] = [];
    for await (const evt of fetchSse("/api/test", {
      body: { foo: "bar" },
      fetchImpl: fakeFetch,
    })) {
      events.push(evt);
    }

    expect(captured.url).toBe("/api/test");
    expect(captured.init.method).toBe("POST");
    expect(JSON.parse(captured.init.body as string)).toEqual({ foo: "bar" });
    const headers = captured.init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(headers.accept).toBe("text/event-stream");
    expect(events[0]?.data).toBe("ok");
  });

  it("signal 中断立刻停止", async () => {
    const fakeFetch: typeof fetch = async () => makeFetchResponse(sseBody(["data: x\n\n"]));
    const ctrl = new AbortController();
    ctrl.abort();

    let count = 0;
    try {
      for await (const _evt of fetchSse("/api/test", {
        fetchImpl: fakeFetch,
        signal: ctrl.signal,
      })) {
        count++;
      }
    } catch {
      // 预期 fetch 直接抛 AbortError
    }
    expect(count).toBe(0);
  });
});
