/**
 * W1 stub：会话回放接口。
 *
 * 计划：W9 落地。届时支持 .genui-dump 文件导入/导出 + 离线 Replay。
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(
    JSON.stringify({
      error: "not_implemented",
      message: "会话回放接口尚未实现。计划在 W9 落地。",
      lab: "workbench",
      plannedMilestone: "W9",
    }),
    {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}
