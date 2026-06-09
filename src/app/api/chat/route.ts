/**
 * /api/chat 路由（W3 升级）。
 *
 * W3 相比 W2：
 * - Zod 校验 body（chatRequestSchema），不合法 → 400 + 详细错误
 * - 接 request.signal：client abort / 网络断 / tab 关闭都能中断 provider.stream
 * - 暴露 ?debug=1 路径用于 curl 单测（无 Zod 解析时）
 * - observability：记录 firstTokenLatencyMs / totalDurationMs
 *   （observability-store 在 client 端；服务端只算时间不发它）
 *
 * 实际发送 / 接收仍然是 provider.stream() → RenderableEvent → SSE 文本。
 */

import type { StreamChunk } from "@/core/models";
import { getModelProvider } from "@/core/models";
import { getScenario, type MockScenario } from "@/core/models/providers/debug-scenarios";
import { chatRequestSchema } from "./schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // fetch + abort 需要 nodejs runtime（edge 没完整 fetch）

const DEV_SCENARIOS: readonly MockScenario[] = ["default", "long", "tools", "error", "reconnect"];

function sseLine(chunk: StreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  // 1. parse + validate
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "validation_failed",
        issues: parsed.error.issues,
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const body = parsed.data;

  // 2. dev-only：注入 scenario 到 tools（mock provider 据此切换行为）
  const url = new URL(request.url);
  const scenarioQ = url.searchParams.get("scenario");
  if (scenarioQ && process.env.NODE_ENV !== "production") {
    const scenario = getScenario(scenarioQ);
    if (scenario === "default" && scenarioQ !== "default") {
      return new Response(
        JSON.stringify({
          error: "invalid_scenario",
          message: `Unknown ?scenario=${scenarioQ}. Valid: long, tools, error, reconnect`,
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    if (scenarioQ !== "default") {
      body.tools = [
        ...(body.tools ?? []),
        {
          name: `scenario:${scenarioQ}`,
          description: `W4-X debug scenario: ${scenarioQ}`,
          parameters: {},
        },
      ];
    }
  } else if (scenarioQ && process.env.NODE_ENV === "production") {
    // prod 直接拒绝带 ?scenario 的请求
    return new Response(
      JSON.stringify({
        error: "scenario_disabled",
        message: "?scenario is dev-only; remove it in production",
      }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }

  // 3. route to provider
  const provider = getModelProvider(body.model);
  const encoder = new TextEncoder();

  // 3. 拿 request.signal —— client abort / 网络断会自动触发
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = performance.now();
      let firstTokenSent = false;
      try {
        for await (const chunk of provider.stream(body, request.signal)) {
          if (!firstTokenSent && chunk.kind === "text") {
            firstTokenSent = true;
            const firstTokenAt = performance.now();
            controller.enqueue(
              encoder.encode(
                sseLine({
                  kind: "control",
                  type: "meta",
                  meta: {
                    firstTokenLatencyMs: Math.round(firstTokenAt - startedAt),
                  },
                }),
              ),
            );
          }
          controller.enqueue(encoder.encode(sseLine(chunk)));
        }
        // 收尾：发一个 totalDuration 的 meta
        const totalDurationMs = Math.round(performance.now() - startedAt);
        controller.enqueue(
          encoder.encode(
            sseLine({
              kind: "control",
              type: "meta",
              meta: { totalDurationMs },
            }),
          ),
        );
        controller.close();
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        const errChunk: StreamChunk = {
          kind: "control",
          type: "error",
          meta: {
            message: err instanceof Error ? err.message : String(err),
            aborted: isAbort,
          },
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
      message: "Use POST. Body: { model, messages, temperature?, maxTokens?, tools? }",
    }),
    { status: 405, headers: { "content-type": "application/json" } },
  );
}
