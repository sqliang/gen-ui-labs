/**
 * W1 stub：通用聊天 SSE 端点。
 *
 * 当前实现：返回 "Service Unavailable" JSON，便于前端在 W2/W3 接入真实 LLM
 * provider 之前联调。等 core/models/ 落地（计划 W2）后，这里会真正流式返回
 * Markdown chunks。
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(
    JSON.stringify({
      error: "not_implemented",
      message: "Chat SSE 端点尚未实现。计划在 W2 接入 core/models/ 后提供。",
      lab: "streaming",
      plannedMilestone: "W2",
    }),
    {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}

export async function POST(): Promise<Response> {
  return GET();
}
