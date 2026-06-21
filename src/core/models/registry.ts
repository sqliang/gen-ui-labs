/**
 * 静态模型注册表。
 *
 * W2 只内置静态清单。W3 起各 provider 可以在 listModels() 时远端拉取真实列表。
 */

import type { ModelInfo } from "./types";

export const BUILTIN_MODELS: ModelInfo[] = [
  // OpenAI
  {
    id: "gpt-4o-mini",
    provider: "openai",
    label: "OpenAI · GPT-4o mini",
    contextWindow: 128_000,
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.6,
  },
  {
    id: "gpt-4o",
    provider: "openai",
    label: "OpenAI · GPT-4o",
    contextWindow: 128_000,
    costPerMillionInput: 2.5,
    costPerMillionOutput: 10,
  },
  {
    id: "gpt-4.1",
    provider: "openai",
    label: "OpenAI · GPT-4.1",
    contextWindow: 1_000_000,
    costPerMillionInput: 3,
    costPerMillionOutput: 12,
  },

  // Anthropic
  {
    id: "claude-sonnet-4-5",
    provider: "anthropic",
    label: "Anthropic · Claude Sonnet 4.5",
    contextWindow: 200_000,
    costPerMillionInput: 3,
    costPerMillionOutput: 15,
  },
  {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    label: "Anthropic · Claude Haiku 4.5",
    contextWindow: 200_000,
    costPerMillionInput: 0.8,
    costPerMillionOutput: 4,
  },

  // Google
  {
    id: "gemini-2.5-pro",
    provider: "google",
    label: "Google · Gemini 2.5 Pro",
    contextWindow: 2_000_000,
    costPerMillionInput: 1.25,
    costPerMillionOutput: 5,
  },
  {
    id: "gemini-2.5-flash",
    provider: "google",
    label: "Google · Gemini 2.5 Flash",
    contextWindow: 1_000_000,
    costPerMillionInput: 0.075,
    costPerMillionOutput: 0.3,
  },

  // DeepSeek
  {
    id: "deepseek-chat",
    provider: "deepseek",
    label: "DeepSeek · Chat",
    contextWindow: 64_000,
    costPerMillionInput: 0.27,
    costPerMillionOutput: 1.1,
  },
  {
    id: "deepseek-reasoner",
    provider: "deepseek",
    label: "DeepSeek · Reasoner",
    contextWindow: 64_000,
    costPerMillionInput: 0.55,
    costPerMillionOutput: 2.19,
  },

  // Qwen（DashScope OpenAI 兼容模式）
  {
    id: "qwen-max",
    provider: "qwen",
    label: "Qwen · Max",
    contextWindow: 128_000,
    costPerMillionInput: 0.4,
    costPerMillionOutput: 1.2,
  },
  {
    id: "qwen-plus",
    provider: "qwen",
    label: "Qwen · Plus",
    contextWindow: 128_000,
    costPerMillionInput: 0.08,
    costPerMillionOutput: 0.16,
  },

  // Ollama（本地；contextWindow 取决于部署，按官方最常见的 8K 估）
  {
    id: "ollama:llama3.1",
    provider: "ollama",
    label: "Ollama · Llama 3.1 (local)",
    contextWindow: 8_192,
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
  },
  {
    id: "ollama:qwen2.5",
    provider: "ollama",
    label: "Ollama · Qwen 2.5 (local)",
    contextWindow: 32_768,
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
  },
];

/** 按 model id 查找 */
export function findModel(id: string): ModelInfo | undefined {
  return BUILTIN_MODELS.find((m) => m.id === id);
}

/** 按 provider 列出模型 */
export function listModelsByProvider(provider: string): ModelInfo[] {
  return BUILTIN_MODELS.filter((m) => m.provider === provider);
}
