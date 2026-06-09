/**
 * Qwen provider（W3 真实）。
 *
 * 走阿里云 DashScope 的 OpenAI 兼容端点：
 * baseUrl: https://dashscope.aliyuncs.com/compatible-mode/v1
 * API Key: process.env.QWEN_API_KEY
 *
 * 注意：DashScope 模型名不带 `qwen-` 前缀，例：`qwen-max` → `qwen-max`（同名）。
 */

import type { ModelProvider, ModelProviderId } from "../types";
import { ModelProviderError } from "../types";
import { OpenAICompatProvider } from "./openai-compat";

class QwenProviderImpl extends OpenAICompatProvider {
  constructor(apiKey: string) {
    super({
      providerId: "qwen",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey,
    });
  }
}

export const qwenProvider: ModelProvider = (() => {
  const key = process.env.QWEN_API_KEY;
  if (!key) {
    return {
      id: "qwen" satisfies ModelProviderId,
      listModels: () => Promise.resolve([]),
      stream() {
        throw new ModelProviderError(
          "QWEN_API_KEY not set. Set it in .env.local to enable real Qwen calls.",
          "qwen",
        );
      },
      generate() {
        return Promise.reject(
          new ModelProviderError(
            "QWEN_API_KEY not set. Set it in .env.local to enable real Qwen calls.",
            "qwen",
          ),
        );
      },
    } satisfies ModelProvider;
  }
  return new QwenProviderImpl(key);
})();
