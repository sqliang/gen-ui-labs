/**
 * DeepSeek provider（W3 真实）。
 *
 * baseUrl: https://api.deepseek.com/v1
 * API Key: process.env.DEEPSEEK_API_KEY
 *
 * 走 OpenAI 兼容协议，model id 不需要映射（deepseek-chat / deepseek-reasoner 直接发）。
 */

import type { ModelProvider, ModelProviderId } from "../types";
import { ModelProviderError } from "../types";
import { OpenAICompatProvider } from "./openai-compat";

class DeepSeekProviderImpl extends OpenAICompatProvider {
  constructor(apiKey: string) {
    super({
      providerId: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      apiKey,
    });
  }
}

export const deepseekProvider: ModelProvider = (() => {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return {
      id: "deepseek" satisfies ModelProviderId,
      listModels: () => Promise.resolve([]),
      stream() {
        throw new ModelProviderError(
          "DEEPSEEK_API_KEY not set. Set it in .env.local to enable real DeepSeek calls.",
          "deepseek",
        );
      },
      generate() {
        return Promise.reject(
          new ModelProviderError(
            "DEEPSEEK_API_KEY not set. Set it in .env.local to enable real DeepSeek calls.",
            "deepseek",
          ),
        );
      },
    } satisfies ModelProvider;
  }
  return new DeepSeekProviderImpl(key);
})();
