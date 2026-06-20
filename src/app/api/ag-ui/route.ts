/**
 * /api/ag-ui 路由（W4-3 mock + W4 末动态）。
 *
 * 返回 AG-UI 协议的 SSE 事件流（NDJSON 格式，一行一个事件）。
 *
 * 事件顺序模拟一个典型的 AG-UI run：
 * RUN_STARTED → TEXT_MESSAGE_CONTENT（多个）→ TOOL_CALL_START → TOOL_CALL_ARGS → TOOL_CALL_END
 * → TEXT_MESSAGE_CONTENT（后续文本）→ RUN_FINISHED
 *
 * W4 末：?prompt=xxx 让 mock 看起来"对 prompt 有反应"。
 * - 包含 "search" / "查询" / "找"：返回带 web_search tool call 的事件流
 * - 包含 "write" / "写" / "create"：返回带 file_create tool call
 * - 包含 "json" / "ui"：返回带 surface_render tool call
 * - 其它：纯文本事件流
 *
 * 真实使用 AG-UI 事件流的 LLM（agent framework）通过这个 SSE 接 stub provider。
 */

import type { AguiEvent } from "@/core/protocols/ag-ui/mapper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sseLine(event: AguiEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

interface ToolSpec {
  trigger: RegExp;
  events: AguiEvent[];
}

const TOOL_TEMPLATES: ToolSpec[] = [
  {
    trigger: /search|搜索|查询|找|lookup/i,
    events: [
      {
        type: "TOOL_CALL_START",
        toolCallId: "call_001",
        toolCallName: "web_search",
        parentMessageId: "msg_1",
      },
      {
        type: "TOOL_CALL_ARGS",
        toolCallId: "call_001",
        delta: '{"query":"genui labs latest"}',
      },
      { type: "TOOL_CALL_END", toolCallId: "call_001" },
    ],
  },
  {
    trigger: /write|写|create|创建|file/i,
    events: [
      {
        type: "TOOL_CALL_START",
        toolCallId: "call_002",
        toolCallName: "file_create",
        parentMessageId: "msg_1",
      },
      {
        type: "TOOL_CALL_ARGS",
        toolCallId: "call_002",
        delta: '{"path":"/tmp/note.md","content":"..."}',
      },
      { type: "TOOL_CALL_END", toolCallId: "call_002" },
    ],
  },
  {
    trigger: /json|ui|界面|UI|render/i,
    events: [
      {
        type: "TOOL_CALL_START",
        toolCallId: "call_003",
        toolCallName: "surface_render",
        parentMessageId: "msg_1",
      },
      {
        type: "TOOL_CALL_ARGS",
        toolCallId: "call_003",
        delta: '{"surfaceId":"main","components":[]}',
      },
      { type: "TOOL_CALL_END", toolCallId: "call_003" },
    ],
  },
];

function buildEventsForPrompt(prompt: string): AguiEvent[] {
  const runId = `run_${Math.random().toString(36).slice(2, 8)}`;
  const threadId = "thread_001";
  const out: AguiEvent[] = [
    { type: "RUN_STARTED", threadId, runId },
    {
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "msg_1",
      delta: `好的，我来处理这个 prompt：${prompt.slice(0, 40)}${prompt.length > 40 ? "..." : ""}\n\n`,
    },
  ];

  // 找到第一个匹配的 tool
  const toolSpec = TOOL_TEMPLATES.find((t) => t.trigger.test(prompt));
  if (toolSpec) {
    out.push({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "msg_1",
      delta: "让我调用一个工具来执行。\n\n",
    });
    out.push(...toolSpec.events);
    out.push({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "msg_2",
      delta: `\n\n工具返回了结果。基于这个结果：\n\n- **AG-UI 协议**：typed event 流\n- **当前进度**：4 events received\n- **下一步**：继续生成文本`,
    });
  } else {
    out.push({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "msg_1",
      delta:
        "GenUI Labs 是一个面向生成式 UI 的实验性工作台，包含 4 个 Lab 和 1 个 Shared Core。\n\n- **Lab 1 Streaming**：UI 协议流式渲染\n- **Lab 2 Codegen**：LLM 生成 UI 代码\n- **Lab 3 Workbench**：三栏调试台\n- **Lab 4 Observability**：Agent 可观测性",
    });
  }

  out.push({ type: "RUN_FINISHED", threadId, runId });
  return out;
}

const TICK_MS = 180;

export async function POST(request: Request): Promise<Response> {
  // 读 body 取 prompt
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
    // 忽略
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
