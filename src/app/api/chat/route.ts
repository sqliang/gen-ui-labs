/**
 * W2 实现：通用聊天 SSE 端点。
 *
 * 接收 ChatRequest，返回 SSE 流：
 * - 每条 message 一个 `data: {<StreamChunk JSON>}\n\n`
 * - StreamChunk.kind 枚举见 core/state/streaming-store.ts 的 RenderableEvent
 *
 * W2 阶段所有模型都走 mock-base 的流式接口。W3 起按 model 选 provider。
 */

import type { ChatRequest, StreamChunk } from "@/core/models";
import { getModelProvider } from "@/core/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // mock-base 用 sleep，需要 nodejs runtime

/**
 * 把 RenderableEvent JSON 序列化为 SSE data 行。
 */
function sseLine(chunk: StreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const provider = getModelProvider(body.model);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.stream(body, new AbortController().signal)) {
          controller.enqueue(encoder.encode(sseLine(chunk)));
        }
        controller.close();
      } catch (err) {
        const errChunk: StreamChunk = {
          kind: "control",
          type: "error",
          meta: { message: err instanceof Error ? err.message : String(err) },
        };
        controller.enqueue(encoder.encode(sseLine(errChunk)));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

export function GET(): Response {
  return new Response(
    JSON.stringify({
      error: "method_not_allowed",
      message: "Use POST. Body: { model, messages, temperature?, maxTokens? }",
    }),
    { status: 405, headers: { "content-type": "application/json" } },
  );
}
