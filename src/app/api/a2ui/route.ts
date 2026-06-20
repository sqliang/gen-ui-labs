/**
 * /api/a2ui 路由（W5 mock + W4 末动态）。
 *
 * 返回 A2UI v0.2 协议的 SSE 事件流。
 * 模拟一个完整的 surface 生命周期：beginRendering → surfaceUpdate → dataModelUpdate → dismissSurface
 *
 * W4 末：?prompt=xxx 让 mock 看起来"对 prompt 有反应"。
 * - 包含 "table" / "表"：返回带 table 组件的 surface
 * - 包含 "chart" / "图"：返回带 chart 组件的 surface
 * - 包含 "form" / "表单"：返回带 form 组件的 surface
 * - 其它：默认 card + text + flex 组合
 */

import type { A2uiEvent } from "@/core/protocols/a2ui/mapper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sseLine(event: A2uiEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

interface SurfaceSpec {
  trigger: RegExp;
  build: (surfaceId: string) => A2uiEvent[];
}

const SURFACE_TEMPLATES: SurfaceSpec[] = [
  {
    trigger: /table|表|grid/i,
    build: (surfaceId) => [
      {
        type: "surfaceUpdate",
        surfaceId,
        contents: [
          {
            id: "root_card",
            component: "card",
            props: { title: "数据表" },
            children: ["table_1"],
          },
          {
            id: "table_1",
            component: "table",
            props: {
              columns: ["ID", "名称", "状态", "时间"],
              rows: [
                ["001", "W1 脚手架", "✅ done", "2026-05-29"],
                ["002", "W2 provider", "✅ done", "2026-06-05"],
                ["003", "W3 markdown", "✅ done", "2026-06-12"],
                ["004", "W4 ag-ui", "✅ done", "2026-06-20"],
              ],
            },
          },
        ],
      },
      {
        type: "dataModelUpdate",
        surfaceId,
        path: "/table_1/rows",
        value: [
          ["001", "W1 脚手架", "✅ done", "2026-05-29"],
          ["002", "W2 provider", "✅ done", "2026-06-05"],
          ["003", "W3 markdown", "✅ done", "2026-06-12"],
          ["004", "W4 ag-ui", "✅ done", "2026-06-20"],
          ["005", "W5 a2ui", "◐ wip", "in progress"],
        ],
      },
    ],
  },
  {
    trigger: /chart|图|柱状|bar|line|pie/i,
    build: (surfaceId) => [
      {
        type: "surfaceUpdate",
        surfaceId,
        contents: [
          {
            id: "root_card",
            component: "card",
            props: { title: "Lab 完成度" },
            children: ["chart_1"],
          },
          {
            id: "chart_1",
            component: "chart",
            props: {
              type: "bar",
              title: "W1–W5 节奏",
              labels: ["W1", "W2", "W3", "W4", "W5"],
              values: [100, 100, 100, 100, 60],
            },
          },
        ],
      },
      {
        type: "dataModelUpdate",
        surfaceId,
        path: "/chart_1/values",
        value: [100, 100, 100, 100, 100],
      },
    ],
  },
  {
    trigger: /form|表单|input|fill/i,
    build: (surfaceId) => [
      {
        type: "surfaceUpdate",
        surfaceId,
        contents: [
          {
            id: "root_card",
            component: "card",
            props: { title: "用户反馈" },
            children: ["form_1"],
          },
          {
            id: "form_1",
            component: "form",
            props: {
              fields: [
                { name: "name", label: "姓名", type: "text" },
                { name: "email", label: "邮箱", type: "text" },
                { name: "feedback", label: "反馈", type: "text" },
              ],
            },
          },
        ],
      },
    ],
  },
];

function defaultBuild(surfaceId: string): A2uiEvent[] {
  return [
    {
      type: "surfaceUpdate",
      surfaceId,
      contents: [
        {
          id: "root_card",
          component: "card",
          props: { title: "GenUI Labs · A2UI Demo" },
          children: ["table_1", "footer_text"],
        },
        {
          id: "table_1",
          component: "table",
          props: {
            columns: ["指标", "值"],
            rows: [
              ["测试数", "68"],
              ["模型数", "13"],
              ["build 时间", "1342ms"],
            ],
          },
        },
        {
          id: "footer_text",
          component: "text",
          props: { content: "A2UI 协议：组件声明 + 数据绑定 → 渲染引擎" },
        },
      ],
    },
  ];
}

function buildEventsForPrompt(prompt: string): A2uiEvent[] {
  const surfaceId = "surface_main";
  const out: A2uiEvent[] = [{ type: "beginRendering", surfaceId, root: "root_card" }];
  const spec = SURFACE_TEMPLATES.find((s) => s.trigger.test(prompt));
  out.push(...(spec ? spec.build(surfaceId) : defaultBuild(surfaceId)));
  // 短促，不 dismiss —— 让用户能看
  return out;
}

const TICK_MS = 200;

export async function POST(request: Request): Promise<Response> {
  let prompt = "default";
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text) as { prompt?: string };
      if (typeof body.prompt === "string" && body.prompt.trim()) {
        prompt = body.prompt.trim();
      }
    }
  } catch {
    // ignore
  }

  const events = buildEventsForPrompt(prompt);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      for (const event of events) {
        controller.enqueue(encoder.encode(sseLine(event)));
        await new Promise<void>((resolve) => setTimeout(resolve, TICK_MS));
      }
      controller.close();
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
      message: "Use POST. Body: { prompt: string }",
    }),
    { status: 405, headers: { "content-type": "application/json" } },
  );
}
