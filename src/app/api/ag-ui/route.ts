/**
 * /api/ag-ui 路由（W4-3 mock）。
 *
 * 返回 AG-UI 协议的 SSE 事件流（NDJSON 格式，一行一个事件）。
 *
 * 事件顺序模拟一个典型的 AG-UI run：
 * RUN_STARTED → TEXT_MESSAGE_CONTENT（多个）→ TOOL_CALL_START → TOOL_CALL_ARGS → TOOL_CALL_END
 * → TEXT_MESSAGE_CONTENT（后续文本）→ RUN_FINISHED
 */

import type { AguiEvent } from "@/core/protocols/ag-ui/mapper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sseLine(event: AguiEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** mock AG-UI 事件序列 */
const MOCK_EVENTS: AguiEvent[] = [
  { type: "RUN_STARTED", threadId: "thread_001", runId: "run_001" },
  {
    type: "TEXT_MESSAGE_CONTENT",
    messageId: "msg_1",
    delta: "好的，我来帮你查一下 GenUI Labs 的最新信息。",
  },
  { type: "TEXT_MESSAGE_CONTENT", messageId: "msg_1", delta: "\n\n让我执行一次网络搜索。" },
  {
    type: "TOOL_CALL_START",
    toolCallId: "call_001",
    toolCallName: "web_search",
    parentMessageId: "msg_1",
  },
  { type: "TOOL_CALL_ARGS", toolCallId: "call_001", delta: '{"query":"GenUI Labs latest"}' },
  { type: "TOOL_CALL_END", toolCallId: "call_001" },
  {
    type: "TEXT_MESSAGE_CONTENT",
    messageId: "msg_2",
    delta:
      "\n\n搜索结果显示 GenUI Labs 是一个面向生成式 UI 的实验性工作台，包含 4 个 Lab 和 1 个 Shared Core。",
  },
  {
    type: "TEXT_MESSAGE_CONTENT",
    messageId: "msg_2",
    delta:
      "\n\n- **Lab 1 Streaming**：UI 协议流式渲染\n- **Lab 2 Codegen**：LLM 生成 UI 代码\n- **Lab 3 Workbench**：三栏调试台\n- **Lab 4 Observability**：Agent 可观测性",
  },
  { type: "RUN_FINISHED", threadId: "thread_001", runId: "run_001" },
];

/** 事件间隔（ms）—— 给点节奏感，让浏览器能看到逐事件到达 */
const TICK_MS = 200;

export async function POST(_request: Request): Promise<Response> {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      for (const event of MOCK_EVENTS) {
        controller.enqueue(encoder.encode(sseLine(event)));
        // 间隔：用 setTimeout + Promise 让出事件循环，
        // 中断靠 client 断开连接（read() 返回 done）
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
      message: "Use POST",
    }),
    { status: 405, headers: { "content-type": "application/json" } },
  );
}
