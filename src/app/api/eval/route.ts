/**
 * W1 stub：UI 评分接口。
 *
 * 计划：W11 落地。届时会接入 axe-core + 自研 rubric。
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(
    JSON.stringify({
      error: "not_implemented",
      message: "UI 评分接口尚未实现。计划在 W11 落地 axe-core + 自研 rubric。",
      lab: "observability",
      plannedMilestone: "W11",
    }),
    {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}
