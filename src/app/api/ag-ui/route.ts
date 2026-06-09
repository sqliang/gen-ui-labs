/**
 * W1 stub：AG-UI 协议服务端点。
 *
 * 计划：W4 落地。当前返回 503 + 计划信息，便于前端在协议对照台场景下
 * mock fallback。
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(
    JSON.stringify({
      error: "not_implemented",
      message: "AG-UI 协议端点尚未实现。计划在 W4 落地自研 reducer + 组件映射。",
      lab: "streaming",
      plannedMilestone: "W4",
      protocol: "ag-ui",
    }),
    {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}
