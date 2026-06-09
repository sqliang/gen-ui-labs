/**
 * Provider 路由：根据 model id 找到对应的 provider 实例。
 *
 * W2 阶段所有 provider 走 mock。W3+ 起：findProviderByModel() 真正起作用。
 */

import { anthropicProvider } from "./providers/anthropic";
import { deepseekProvider } from "./providers/deepseek";
import { googleProvider } from "./providers/google";
import { makeMockProvider } from "./providers/mock-base";
import { ollamaProvider } from "./providers/ollama";
import { openaiProvider } from "./providers/openai";
import { qwenProvider } from "./providers/qwen";
import { findModel } from "./registry";
import type { ModelInfo, ModelProvider, ModelProviderId } from "./types";

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
 */
export function getModelProvider(modelId: string): ModelProvider {
  const info = findModel(modelId);
  if (!info) {
    // 未知 model id：返回一个 mock provider（不抛错，方便 dev 环境探索）
    return makeMockProvider("openai");
  }
  return BUILTIN_PROVIDERS[info.provider];
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
