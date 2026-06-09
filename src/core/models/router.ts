/**
 * Provider 路由：根据 model id 找到对应的 provider 实例。
 *
 * W2 阶段所有 provider 走 mock。W3+ 起：findProviderByModel() 真正起作用。
 */

import { anthropicProvider } from "./providers/anthropic";
import { deepseekProvider } from "./providers/deepseek";
import { googleProvider } from "./providers/google";
import { ollamaProvider } from "./providers/ollama";
import { openaiProvider } from "./providers/openai";
import { qwenProvider } from "./providers/qwen";
import { findModel } from "./registry";
import {
  type ModelInfo,
  type ModelProvider,
  ModelProviderError,
  type ModelProviderId,
} from "./types";

/** Provider 注册表（W2 阶段：6 个 provider stub） */
export const BUILTIN_PROVIDERS: Record<ModelProviderId, ModelProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  deepseek: deepseekProvider,
  qwen: qwenProvider,
  ollama: ollamaProvider,
};

/**
 * 通过 model id 找 provider。
 *
 * 例：`getModelProvider("gpt-4o-mini")` → openaiProvider
 * 例：`getModelProvider("ollama:llama3.1")` → ollamaProvider
 *
 * 兜底策略（W3 起 env-controlled）：
 * - dev 环境（NODE_ENV !== "production"）：未知 model id 静默走 openaiProvider，
 *   方便探索。但 stream() 内部仍然会因 OPENAI_API_KEY 缺失抛错。
 * - prod 环境（NODE_ENV === "production"）：未知 model id 抛 ModelProviderError，
 *   避免"用户拼错 id 导致静默走错 provider"的事故。
 */
export function getModelProvider(modelId: string): ModelProvider {
  const info = findModel(modelId);
  if (info) {
    return BUILTIN_PROVIDERS[info.provider];
  }

  // 未知 model id
  if (process.env.NODE_ENV === "production") {
    throw new ModelProviderError(
      `Unknown model id: ${modelId}. Check BUILTIN_MODELS in core/models/registry.ts.`,
      "openai", // 占位：实际场景下这个 throw 会中断路由
      undefined,
    );
  }
  // dev：静默兜底
  return BUILTIN_PROVIDERS.openai;
}

/** 通过 provider id 直接拿 provider 实例 */
export function getProviderById(id: ModelProviderId): ModelProvider {
  return BUILTIN_PROVIDERS[id];
}

/**
 * 列出指定 provider 的可用模型（合并内置 + provider 自报）。
 * W2 阶段直接返回内置；W3+ 起会异步合并 provider.listModels()。
 */
export async function listAvailableModels(provider: ModelProviderId): Promise<ModelInfo[]> {
  const remote = await BUILTIN_PROVIDERS[provider].listModels();
  return remote; // W2 阶段空数组；W3 起会 merge 内置 + remote
}
