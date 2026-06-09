/**
 * infra/http —— 通用 HTTP / SSE 工具。
 *
 * W2 范围：
 * - SSE 客户端（fetch + ReadableStream 解析）
 * - JSON POST helper
 * W3+：axios 替换？取消 token？重试？观察现在的需求决定。
 */

/** SSE 客户端选项 */
export interface SseOptions {
  /** 请求方法，默认 POST */
  method?: "GET" | "POST";
  /** 请求 body（POST 时使用） */
  body?: unknown;
  /** 额外请求头 */
  headers?: Record<string, string>;
  /** AbortController.signal —— 用于取消 */
  signal?: AbortSignal;
  /** 自定义 fetch 实现（用于测试） */
  fetchImpl?: typeof fetch;
}

/** SSE 事件 */
export interface SseEvent {
  /** event: 字段 */
  event?: string;
  /** data: 字段（已拼接多行） */
  data: string;
  /** id: 字段 */
  id?: string;
}

/**
 * 用 fetch + ReadableStream 消费 Server-Sent Events。
 *
 * 返回 AsyncIterable<SseEvent>，调用方负责 break / try-catch / AbortController。
 *
 * @example
 * ```ts
 * for await (const evt of fetchSse("/api/chat", { body: { prompt: "hi" } })) {
 *   console.log(evt.data);
 * }
 * ```
 */
export async function* fetchSse(url: string, options: SseOptions = {}): AsyncIterable<SseEvent> {
  const f = options.fetchImpl ?? fetch;
  const response = await f(url, {
    method: options.method ?? "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("SSE response has no body");
  }

  yield* parseSseResponse(response, options.signal ?? new AbortController().signal);
}

/**
 * 把 fetch Response 解析为 SSE 事件流。
 * 独立导出供测试 / 复用（比如直接调 OpenAI 的 SSE API 时）。
 */
export async function* parseSseResponse(
  response: Response,
  signal: AbortSignal,
): AsyncIterable<SseEvent> {
  if (!response.ok || !response.body) {
    throw new Error(`SSE response not ok or no body: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const evt of events) {
        const parsed = parseSseEvent(evt);
        if (parsed) yield parsed;
      }
    }

    if (buffer.trim()) {
      const parsed = parseSseEvent(buffer);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

/** 解析单个 SSE 事件块（导出供测试） */
export function parseSseEvent(raw: string): SseEvent | null {
  const lines = raw.split("\n");
  let event: string | undefined;
  let id: string | undefined;
  let data = "";
  for (const line of lines) {
    if (line.startsWith(":")) continue; // 注释
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("id:")) id = line.slice(3).trim();
    else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trim();
  }
  if (!data && !event) return null;
  return { event, id, data };
}

/** 简单的 JSON POST helper */
export async function postJson<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...init?.headers },
    body: JSON.stringify(body),
    ...init,
  });
  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}
