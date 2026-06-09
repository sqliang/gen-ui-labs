/**
 * Ollama provider（W3 真实，走 OpenAI 兼容模式）。
 *
 * 启动 Ollama 时自带 OpenAI 兼容端点（>=0.1.14）：
 * baseUrl: http://localhost:11434/v1
 * API Key: 任意字符串（Ollama 不校验）
 *
 * 模型 id 形如 `ollama:llama3.1`，调用时去掉 `ollama:` 前缀。
 */

import type { ModelProvider } from "../types";
import { OpenAICompatProvider } from "./openai-compat";

class OllamaProviderImpl extends OpenAICompatProvider {
  constructor(apiKey = "ollama") {
    super({
      providerId: "ollama",
      baseUrl: "http://localhost:11434/v1",
      apiKey,
      // 模型 id 可能带 "ollama:" 前缀（来自 registry），发请求时去掉
      modelMap: (id) => id.replace(/^ollama:/, ""),
    });
  }
}

/** Ollama 默认有 stub apiKey，连接失败时由后端捕获 */
export const ollamaProvider: ModelProvider = new OllamaProviderImpl();
