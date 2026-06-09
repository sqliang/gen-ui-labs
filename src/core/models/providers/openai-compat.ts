/**
 * OpenAI 兼容协议的通用 HTTP 客户端。
 *
 * 适配的 provider（全部走 OpenAI /v1/chat/completions 接口，仅 baseURL + apiKey 不同）：
 * - OpenAI        ：https://api.openai.com/v1
 * - DeepSeek      ：https://api.deepseek.com/v1
 * - Qwen (DashScope)：https://dashscope.aliyuncs.com/compatible-mode/v1
 * - Ollama (OpenAI 兼容模式) ：http://localhost:11434/v1
 *
 * 不适配的 provider（走自家协议）：
 * - Anthropic（Messages API + x-api-key）
 * - Google Gemini（generateContent + URL query key）
 *
 * W3 范围：实现 stream() + generate() 两个方法；errors 走 ModelProviderError。
 * W4+：tool_calls / parallel tool / structured output。
 */

import { parseSseResponse } from "@/infra/http/sse-client";
import type {
  ChatRequest,
  ChatResponse,
  ModelProvider,
  ModelProviderId,
  StreamChunk,
} from "../types";
import { ModelProviderError } from "../types";

/** OpenAI 兼容 provider 的最小配置 */
export interface OpenAICompatConfig {
  providerId: ModelProviderId;
  baseUrl: string;
  apiKey: string;
  /** 模型 id 到 OpenAI 端模型名的映射（默认等于 ChatRequest.model） */
  modelMap?: (id: string) => string;
}

export class OpenAICompatProvider implements ModelProvider {
  readonly id: ModelProviderId;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly modelMap: (id: string) => string;

  constructor(config: OpenAICompatConfig) {
    this.id = config.providerId;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.modelMap = config.modelMap ?? ((id) => id);
  }

  // listModels: W3 阶段直接返回 []，W4 起拉 /v1/models
  async listModels(): Promise<never[]> {
    return [];
  }

  /**
   * 流式：fetch + ReadableStream → SSE → 拆 chunk → 转 RenderableEvent。
   *
   * OpenAI 兼容协议的 chunk 形态：
   *   { choices: [{ delta: { content?: string }, finish_reason?: string }] }
   * 拆成我们的：
   *   start → text* → end
   */
  async *stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<StreamChunk> {
    yield { kind: "control", type: "start" };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelMap(req.model),
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: req.temperature ?? 1,
        max_tokens: req.maxTokens,
        stream: true,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new ModelProviderError(
        `${this.id} returned ${response.status}: ${text || response.statusText}`,
        this.id,
        response.status,
      );
    }

    for await (const evt of parseSseResponse(response, signal)) {
      if (signal.aborted) break;
      let parsed: OpenAIChunk;
      try {
        parsed = JSON.parse(evt.data) as OpenAIChunk;
      } catch {
        continue; // 跳过 [DONE] 等非 JSON 行
      }
      if (!parsed) continue;

      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) {
        yield { kind: "text", delta };
      }

      const finishReason = parsed.choices?.[0]?.finish_reason;
      if (finishReason === "stop" || finishReason === "length") {
        yield { kind: "control", type: "end" };
        return;
      }
    }

    // 兜底：流关闭但没收到 finish_reason
    yield { kind: "control", type: "end" };
  }

  async generate(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelMap(req.model),
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: req.temperature ?? 1,
        max_tokens: req.maxTokens,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ModelProviderError(
        `${this.id} returned ${response.status}: ${text || response.statusText}`,
        this.id,
        response.status,
      );
    }

    const data = (await response.json()) as OpenAIResponse;
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      finishReason: (data.choices?.[0]?.finish_reason ?? "stop") as
        | "stop"
        | "length"
        | "tool_calls"
        | "error",
    };
  }
}

// ===== OpenAI 协议响应类型（最小集） =====

interface OpenAIChunk {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    delta?: { role?: string; content?: string; tool_calls?: unknown };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface OpenAIResponse {
  id?: string;
  choices?: Array<{
    message?: { role?: string; content?: string };
    finish_reason?: string;
    index?: number;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}
