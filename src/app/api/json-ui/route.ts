/**
 * /api/json-ui 路由（W6 mock + W6 末 deepseek 真接）。
 *
 * 返回 JSON-UI DSL 的 SSE 流。
 * 每行 data 是一个 JsonUiPatch（增量），客户端累积构建 JsonUiDocument。
 *
 * W6 末：当 body.provider === "deepseek" 时，
 * 真调 deepseek-chat 让 LLM 输出 JSON-UI patch JSON 数组，
 * server 解析后转 SSE 流。无 key 时自动回退 mock。
 */

import type { JsonUiPatch } from "@/core/engine/json-ui/types";
import { getModelProvider } from "@/core/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // fetch + deepseek API call

function sseLine(patch: JsonUiPatch): string {
  return `data: ${JSON.stringify(patch)}\n\n`;
}

const DEEPSEEK_SYSTEM_PROMPT = `You are a JSON-UI patch generator. Output ONLY a valid JSON array of patches.

Schema (each element is one patch):
- mount: {"op":"mount","path":"/root/children/N","value":{"type":"...","props":{...}}}
- patch: {"op":"patch","path":"/root/...","value":{...}}
- unmount: {"op":"unmount","path":"/root/children/N"}

Available node types: card, text, button, grid, flex, table, chart, input, badge, divider.
Rules:
1. First patch must mount /root (card or grid)
2. Build a meaningful UI (4-8 patches total)
3. Output ONLY the JSON array, no markdown fences, no preamble`;

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
  let provider: unknown = "mock";
  let prompt = "";
  try {
    const body = (await request.json()) as {
      scenario?: unknown;
      provider?: unknown;
      prompt?: unknown;
    };
    if (typeof body.scenario === "string") scenario = body.scenario;
    if (typeof body.provider === "string") provider = body.provider;
    if (typeof body.prompt === "string") prompt = body.prompt;
  } catch {
    // no body or invalid JSON → defaults
  }

  // 真 deepseek 路径
  if (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) {
    return await deepseekStream(request, prompt);
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

async function deepseekStream(request: Request, prompt: string): Promise<Response> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const provider = getModelProvider("deepseek-chat");
        if (!provider) {
          controller.enqueue(
            encoder.encode(
              sseLine({
                op: "patch",
                path: "/root",
                value: { type: "text", props: { content: "deepseek provider not found" } },
              }),
            ),
          );
          controller.close();
          return;
        }
        let accumulated = "";
        for await (const chunk of provider.stream(
          {
            model: "deepseek-chat",
            messages: [
              { role: "system", content: DEEPSEEK_SYSTEM_PROMPT },
              { role: "user", content: prompt || "生成一个简单的卡片 UI" },
            ],
          },
          request.signal,
        )) {
          if (chunk.kind === "text") {
            accumulated += chunk.delta;
          }
        }

        // 解析 deepseek 输出 —— 找 JSON 数组边界
        const arrStart = accumulated.indexOf("[");
        const arrEnd = accumulated.lastIndexOf("]");
        if (arrStart === -1 || arrEnd === -1) {
          controller.enqueue(
            encoder.encode(
              sseLine({
                op: "patch",
                path: "/root",
                value: {
                  type: "text",
                  props: { content: `deepseek 返回无 JSON 数组：${accumulated.slice(0, 80)}` },
                },
              }),
            ),
          );
          controller.close();
          return;
        }
        const json = accumulated.slice(arrStart, arrEnd + 1);
        const parsed = JSON.parse(json) as JsonUiPatch[];
        for (const patch of parsed) {
          controller.enqueue(encoder.encode(sseLine(patch)));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(
            sseLine({
              op: "patch",
              path: "/root",
              value: { type: "text", props: { content: `deepseek error: ${msg}` } },
            }),
          ),
        );
      } finally {
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
  return new Response(JSON.stringify({ error: "method_not_allowed", message: "Use POST" }), {
    status: 405,
    headers: { "content-type": "application/json" },
  });
}
