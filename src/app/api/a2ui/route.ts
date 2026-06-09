/**
 * /api/a2ui 路由（W5 mock）。
 *
 * 返回 A2UI v0.2 协议的 SSE 事件流。
 * 模拟一个完整的 surface 生命周期：beginRendering → surfaceUpdate → dataModelUpdate → dismissSurface
 */

import type { A2uiEvent } from "@/core/protocols/a2ui/mapper";

export const dynamic = "force-dynamic";

function sseLine(event: A2uiEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

const MOCK_EVENTS: A2uiEvent[] = [
  {
    type: "beginRendering",
    surfaceId: "surface_main",
    root: "root_card",
  },
  {
    type: "surfaceUpdate",
    surfaceId: "surface_main",
    contents: [
      {
        id: "root_card",
        component: "card",
        props: { title: "GenUI Labs · A2UI Demo", padding: "1rem" },
        children: ["chart_1", "table_1", "footer_text"],
      },
      {
        id: "chart_1",
        component: "chart",
        props: {
          type: "bar",
          title: "Lab 完成度",
          labels: ["W1", "W2", "W3", "W4", "W5"],
          values: [100, 100, 100, 100, 60],
        },
      },
      {
        id: "table_1",
        component: "table",
        props: {
          columns: ["指标", "值"],
          rows: [
            ["测试数", "68"],
            ["模型数", "13"],
            ["build 时间", "1421ms"],
          ],
        },
      },
      {
        id: "footer_text",
        component: "text",
        props: {
          content: "A2UI 协议：组件声明 + 数据绑定 → 渲染引擎",
          align: "center",
        },
      },
    ],
  },
  {
    type: "dataModelUpdate",
    surfaceId: "surface_main",
    path: "/chart_1/values",
    value: [100, 100, 100, 100, 100],
  },
  {
    type: "dismissSurface",
    surfaceId: "surface_main",
  },
];

export async function POST(_request: Request): Promise<Response> {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const event of MOCK_EVENTS) {
        controller.enqueue(encoder.encode(sseLine(event)));
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
  return new Response(JSON.stringify({ error: "method_not_allowed", message: "Use POST" }), {
    status: 405,
    headers: { "content-type": "application/json" },
  });
}
