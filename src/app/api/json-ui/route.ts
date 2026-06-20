/**
 * /api/json-ui 路由（W6 mock）。
 *
 * 返回 JSON-UI DSL 的 SSE 流。
 * 每行 data 是一个 JsonUiPatch（增量），客户端累积构建 JsonUiDocument。
 */

import type { JsonUiPatch } from "@/core/engine/json-ui/types";

export const dynamic = "force-dynamic";

function sseLine(patch: JsonUiPatch): string {
  return `data: ${JSON.stringify(patch)}\n\n`;
}

const MOCK_PATCHES: JsonUiPatch[] = [
  {
    op: "mount",
    path: "/root",
    value: { type: "card", props: { title: "GenUI Labs · JSON-UI Demo" } },
  },
  { op: "mount", path: "/root/children/0", value: { type: "grid", props: {} } },
  {
    op: "mount",
    path: "/root/children/0/children/0",
    value: {
      type: "card",
      props: { title: "测试覆盖" },
      children: [
        {
          type: "table",
          props: {
            columns: ["指标", "值"],
            rows: [
              ["测试文件", "10"],
              ["测试用例", "68"],
              ["通过率", "100%"],
              ["build 时间", "1342ms"],
            ],
          },
        },
      ],
    },
  },
  {
    op: "mount",
    path: "/root/children/0/children/1",
    value: {
      type: "card",
      props: { title: "模型矩阵" },
      children: [
        {
          type: "table",
          props: {
            columns: ["Provider", "模型数", "状态"],
            rows: [
              ["OpenAI", "3", "✅ ready"],
              ["Anthropic", "2", "🔧 mock"],
              ["Google", "2", "🔧 mock"],
              ["DeepSeek", "2", "✅ real"],
              ["Qwen", "2", "✅ ready"],
              ["Ollama", "2", "✅ ready"],
            ],
          },
        },
      ],
    },
  },
  { op: "mount", path: "/root/children/2", value: { type: "flex", props: {} } },
  {
    op: "mount",
    path: "/root/children/2/children/0",
    value: {
      type: "card",
      props: { title: "Hi {user.name} · 欢迎来到 {lab} v{version}" },
    },
  },
  {
    op: "mount",
    path: "/root/children/2/children/1",
    value: {
      type: "text",
      props: {
        content:
          "上面 title 里的 {user.name} / {lab} / {version} 都被替换成 state 实际值。点 toggle 切换 state.user.name 看效果。",
      },
    },
  },
  { op: "mount", path: "/root/children/3", value: { type: "flex", props: {} } },
  {
    op: "mount",
    path: "/root/children/3/children/0",
    value: { type: "button", props: { label: "✅ Markdown 协议", variant: "default" } },
  },
  {
    op: "mount",
    path: "/root/children/3/children/1",
    value: { type: "button", props: { label: "✅ AG-UI 协议", variant: "outline" } },
  },
  {
    op: "mount",
    path: "/root/children/3/children/2",
    value: { type: "button", props: { label: "✅ A2UI 协议", variant: "outline" } },
  },
  {
    op: "mount",
    path: "/root/children/4",
    value: {
      type: "chart",
      props: {
        title: "W1–W12 节奏",
        type: "bar",
        labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
        values: [1, 1, 1, 1, 0.6, 0.4, 0, 0, 0, 0, 0, 0],
      },
    },
  },
  {
    op: "mount",
    path: "/root/children/5",
    value: {
      type: "text",
      props: {
        content:
          "JSON-UI 引擎：声明式 DSL → React 组件递归渲染。W6 落地 card / button / text / table / flex / grid / chart + W7 表达式。",
      },
    },
  },
];

export async function POST(_request: Request): Promise<Response> {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const patch of MOCK_PATCHES) {
        controller.enqueue(encoder.encode(sseLine(patch)));
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
