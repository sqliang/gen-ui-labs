/**
 * Provider 通用工具 + Mock 引擎。
 *
 * W2 阶段：所有 provider 都走 mock，输出预定义的 Markdown 文本流。
 * W3+ 逐家替换为真实 HTTP 调用 —— 参考 providers/openai.ts 等注释。
 */

import { sleep } from "@/lib/utils";
import type {
  ChatRequest,
  ChatResponse,
  ModelInfo,
  ModelProvider,
  ModelProviderId,
  StreamChunk,
} from "../types";

/** 模拟脚本：根据 prompt 关键词返回不同的固定响应 */
const MOCK_SCRIPT: Array<{ match: RegExp; reply: string }> = [
  {
    match: /react/i,
    reply:
      '# 这是 Lab 1.1.1 Markdown 流式演示\n\n这是 W2 mock 模式生成的真实**流式响应**——通过 SSE 通道从 `/api/chat` 推到前端。\n\n## W2 已实现的能力\n\n- 多模型 provider 抽象接口\n- SSE 通道（`infra/http/sse-client.ts`）\n- `/api/chat` 真正跑通\n- 前端从「本地 setTimeout 模拟」切到「真实 fetch + ReadableStream」\n\n## 待办\n\n> W3 接入真实 LLM（OpenAI / Anthropic / Google / DeepSeek / Qwen）；Ollama 走本地代理。\n\n```ts\n// 取模型\nimport { getModelProvider } from "@/core/models";\nconst provider = getModelProvider("openai");\n```\n',
  },
  {
    match: /ag-ui/i,
    reply:
      "## AG-UI 协议 placeholder\n\nW4 将在此基础上接入真正的 AG-UI 事件流（`TEXT_MESSAGE_CONTENT` / `TOOL_CALL_START` 等）。\n",
  },
  {
    match: /a2ui/i,
    reply:
      "## A2UI 协议 placeholder\n\nW5 接入 A2UI v0.2 规范的 `surfaceUpdate` / `dataModelUpdate`。\n",
  },
  {
    match: /json.ui|dsl/i,
    reply: "## JSON-UI DSL placeholder\n\nW6 落地 JSON-UI → React 引擎。\n",
  },
];

/** 默认 fallback */
const DEFAULT_REPLY =
  "# GenUI Labs · W2 Mock 响应\n\n你发的 prompt 是：\n\n> （原文省略）\n\n这是 `/api/chat` 的 mock 实现，**W2 阶段所有 provider 都走这里**。\n\n后续 W3 起：\n\n- OpenAI / Anthropic / Google / DeepSeek / Qwen 走云端 API\n- Ollama 走本地代理\n- 所有响应仍是 SSE 流式，前端无需改动\n";

function pickReply(prompt: string): string {
  for (const { match, reply } of MOCK_SCRIPT) {
    if (match.test(prompt)) return reply;
  }
  return DEFAULT_REPLY;
}

/**
 * 通用 mock provider base 类。
 * W2 阶段所有 6 个 provider 都继承这个，行为完全一致。
 * W3+ 各自 override stream() / generate() 接入真实 API。
 */
export abstract class MockModelProvider implements ModelProvider {
  abstract readonly id: ModelProviderId;

  listModels(): Promise<ModelInfo[]> {
    // W2: stub 阶段直接返回空数组；W3 起各 provider 自己实现 listModels()
    return Promise.resolve([]);
  }

  /**
   * Mock 流式：每 30ms 推一个 chunk。
   * 模拟首 token 延迟 200ms（方便 Lab 4 测 firstTokenLatencyMs）。
   */
  async *stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<StreamChunk> {
    const userMsg = req.messages[req.messages.length - 1];
    const prompt = userMsg?.content ?? "";
    const reply = pickReply(prompt);

    // start
    yield { kind: "control", type: "start" };

    // 模拟首 token 延迟
    await sleep(200);
    if (signal.aborted) return;

    // 按 chunk 推文本
    const chunkSize = 8;
    for (let i = 0; i < reply.length; i += chunkSize) {
      if (signal.aborted) return;
      const delta = reply.slice(i, i + chunkSize);
      yield { kind: "text", delta };
      await sleep(30);
    }

    yield { kind: "control", type: "end" };
  }

  async generate(req: ChatRequest, _signal: AbortSignal): Promise<ChatResponse> {
    const userMsg = req.messages[req.messages.length - 1];
    const prompt = userMsg?.content ?? "";
    const reply = pickReply(prompt);
    return {
      content: reply,
      usage: {
        promptTokens: prompt.length / 4, // 粗估
        completionTokens: reply.length / 4,
        totalTokens: (prompt.length + reply.length) / 4,
      },
      finishReason: "stop",
    };
  }
}

/** 抽象基类的快捷 stub helper */
export function makeMockProvider(id: ModelProviderId): ModelProvider {
  return new (class extends MockModelProvider {
    readonly id = id;
  })();
}
