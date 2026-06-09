/**
 * OpenAI provider（W3 真实）。
 *
 * baseUrl: https://api.openai.com/v1
 * API Key: process.env.OPENAI_API_KEY
 *
 * W3 阶段：env 缺失 → 抛 ModelProviderError（让上层决定降级到 mock）。
 * 也可以传 explicit apiKey 给构造函数（测试时用）。
 */

import type { ModelProvider, ModelProviderId } from "../types";
import { ModelProviderError } from "../types";
import { OpenAICompatProvider } from "./openai-compat";

class OpenAIProviderImpl extends OpenAICompatProvider {
  constructor(apiKey: string) {
    super({
      providerId: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey,
    });
  }
}

/** W3 factory：按 env 决定是否可用 */
export const openaiProvider: ModelProvider = (() => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      id: "openai" satisfies ModelProviderId,
      listModels: () => Promise.resolve([]),
      stream() {
        throw new ModelProviderError(
          "OPENAI_API_KEY not set. Set it in .env.local to enable real OpenAI calls.",
          "openai",
        );
      },
      generate() {
        return Promise.reject(
          new ModelProviderError(
            "OPENAI_API_KEY not set. Set it in .env.local to enable real OpenAI calls.",
            "openai",
          ),
        );
      },
    } satisfies ModelProvider;
  }
  return new OpenAIProviderImpl(key);
})();
