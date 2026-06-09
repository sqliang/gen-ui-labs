/**
 * Provider 通用工具 + Mock 引擎。
 *
 * W2 阶段：所有 provider 都走 mock，输出预定义的 Markdown 文本流。
 * W3+ 真实 provider 走各家协议；mock-base 仍可用作测试 fixture。
 *
 * 调试场景（debug-scenarios.ts）：通过 ChatRequest.tools 里的工具名
 * 触发"长流 / 工具调用 / 中途错误 / 重连"等场景。W4-X 引入。
 */
import type {
  ChatRequest,
  ChatResponse,
  ModelInfo,
  ModelProvider,
  ModelProviderId,
  StreamChunk,
} from "../types";
import { getScenario, type MockScenario, SCENARIOS } from "./debug-scenarios";

/** 从 ChatRequest.tools 第一个 tool 的 name 推断 scenario */
function detectScenario(req: ChatRequest): MockScenario {
  const t = req.tools?.[0];
  if (t?.name?.startsWith("scenario:")) {
    return getScenario(t.name.slice("scenario:".length));
  }
  return "default";
}

/**
 * 通用 mock provider base 类。
 * W2 阶段所有 6 个 provider 都继承这个，行为完全一致。
 * W3+ 各自 override stream() / generate() 接入真实 API。
 */
export abstract class MockModelProvider implements ModelProvider {
  abstract readonly id: ModelProviderId;

  listModels(): Promise<ModelInfo[]> {
    return Promise.resolve([]);
  }

  /**
   * Mock 流式：调用 debug-scenarios 里的脚本。
   * 默认 scenario 是关键词匹配；特殊 scenario 通过 ChatRequest.tools
   * 第一个 tool name 触发（"scenario:long" 等）。
   */
  async *stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<StreamChunk> {
    const userMsg = req.messages[req.messages.length - 1];
    const prompt = userMsg?.content ?? "";
    const scenario = detectScenario(req);
    const script = SCENARIOS[scenario];
    yield* script(prompt, signal);
  }

  async generate(req: ChatRequest, _signal: AbortSignal): Promise<ChatResponse> {
    const userMsg = req.messages[req.messages.length - 1];
    const prompt = userMsg?.content ?? "";
    const reply = `mock generate reply for: ${prompt.slice(0, 50)}`;
    return {
      content: reply,
      usage: {
        promptTokens: prompt.length / 4,
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
