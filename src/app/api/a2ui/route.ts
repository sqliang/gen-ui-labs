/**
 * W1 stub：A2UI 协议服务端点。
 *
 * 计划：W5 落地。
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(
    JSON.stringify({
      error: "not_implemented",
      message: "A2UI 协议端点尚未实现。计划在 W5 落地。",
      lab: "streaming",
      plannedMilestone: "W5",
      protocol: "a2ui",
    }),
    {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}
