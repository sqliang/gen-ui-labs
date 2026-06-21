/**
 * core/models/ 公共类型。
 *
 * 设计原则：
 * - ChatRequest/Response/StreamChunk 是 provider-agnostic 的中间表示
 * - StreamChunk.kind 取值与 core/state/streaming-store.ts 的 RenderableEvent 对齐
 *   （text / component / state / tool / control）
 */

import type { RenderableEvent } from "@/core/protocols/common/types";

/** 模型 provider id 列表（与 BUILTIN_MODELS 中的 provider 字段对齐） */
export type ModelProviderId = "openai" | "anthropic" | "google" | "deepseek" | "qwen" | "ollama";

export interface ModelInfo {
  /** provider id */
  provider: ModelProviderId;
  /** 全局唯一模型 id（含 provider 前缀以避免冲突） */
  id: string;
  /** 人类可读 label（"OpenAI · GPT-4o mini"） */
  label: string;
  /** context window（token 数） */
  contextWindow: number;
  /** USD per 1M prompt tokens（input 成本） */
  costPerMillionInput?: number;
  /** USD per 1M completion tokens（output 成本） */
  costPerMillionOutput?: number;
}

/** 聊天消息 */
export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "tool"; content: string; toolCallId: string };

/** 单次聊天请求 */
export interface ChatRequest {
  /** 模型 id（如 "gpt-4o-mini"） */
  model: string;
  messages: ChatMessage[];
  /** 采样温度（0–2，默认 1） */
  temperature?: number;
  /** 最大输出 token */
  maxTokens?: number;
  /** 是否流式（true 时应调 stream()） */
  stream?: boolean;
  /** 是否启用工具调用（W8 落地 Agent 时用） */
  tools?: ToolSpec[];
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

/** 非流式响应 */
export interface ChatResponse {
  /** 最终文本 */
  content: string;
  /** token 用量 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 完成原因 */
  finishReason?: "stop" | "length" | "tool_calls" | "error";
}

/** 流式 chunk —— 与 RenderableEvent 对齐 */
export type StreamChunk = RenderableEvent;

/** Provider 统一接口（W2 阶段所有 provider 都实现这个） */
export interface ModelProvider {
  readonly id: ModelProviderId;
  listModels(): Promise<ModelInfo[]>;
  stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<StreamChunk>;
  generate(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse>;
}

/** provider 错误 */
export class ModelProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ModelProviderId,
    public readonly statusCode?: number,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ModelProviderError";
  }
}
