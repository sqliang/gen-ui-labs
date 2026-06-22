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

const MOCK_PATCHES_DEFAULT: JsonUiPatch[] = [
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

const MOCK_PATCHES_CHART: JsonUiPatch[] = [
  {
    op: "mount",
    path: "/root",
    value: { type: "card", props: { title: "GenUI Labs · 图表演示" } },
  },
  { op: "mount", path: "/root/children/0", value: { type: "chart", props: { type: "bar" } } },
  {
    op: "patch",
    path: "/root/children/0/props",
    value: {
      type: "bar",
      data: [
        { label: "Mon", value: 42 },
        { label: "Tue", value: 67 },
        { label: "Wed", value: 88 },
        { label: "Thu", value: 53 },
        { label: "Fri", value: 91 },
        { label: "Sat", value: 75 },
        { label: "Sun", value: 60 },
      ],
      accent: "oklch(0.78 0.16 230)",
    },
  },
  { op: "mount", path: "/root/children/1", value: { type: "chart", props: { type: "line" } } },
  {
    op: "patch",
    path: "/root/children/1/props",
    value: {
      type: "line",
      data: [
        { label: "Jan", value: 12 },
        { label: "Feb", value: 18 },
        { label: "Mar", value: 25 },
        { label: "Apr", value: 32 },
        { label: "May", value: 45 },
        { label: "Jun", value: 58 },
      ],
      accent: "oklch(0.78 0.16 145)",
    },
  },
  {
    op: "mount",
    path: "/root/children/2",
    value: {
      type: "text",
      props: { content: "上面两个 chart 用的是同一份 mock data 节点，加载 4 patches 就能渲染。" },
    },
  },
];

const MOCK_PATCHES_FORM: JsonUiPatch[] = [
  {
    op: "mount",
    path: "/root",
    value: { type: "card", props: { title: "登录" } },
  },
  {
    op: "mount",
    path: "/root/children/0",
    value: {
      type: "input",
      props: { type: "email", label: "Email", placeholder: "you@example.com" },
    },
  },
  {
    op: "mount",
    path: "/root/children/1",
    value: { type: "input", props: { type: "password", label: "Password" } },
  },
  {
    op: "mount",
    path: "/root/children/2",
    value: { type: "button", props: { label: "Sign in" } },
  },
  {
    op: "mount",
    path: "/root/children/3",
    value: { type: "text", props: { content: "form scenario：5 patches 就能出登录表单。" } },
  },
];

function pickScenario(scenario: unknown): JsonUiPatch[] {
  if (scenario === "chart") return MOCK_PATCHES_CHART;
  if (scenario === "form") return MOCK_PATCHES_FORM;
  return MOCK_PATCHES_DEFAULT;
}

export async function POST(request: Request): Promise<Response> {
  let scenario: unknown = "default";
  try {
    const body = (await request.json()) as { scenario?: unknown };
    if (typeof body.scenario === "string") scenario = body.scenario;
  } catch {
    // no body or invalid JSON → default
  }
  const patches = pickScenario(scenario);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const patch of patches) {
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
