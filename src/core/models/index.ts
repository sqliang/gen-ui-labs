/**
 * 多模型 provider 路由（core/models/）。
 *
 * 设计原则（PROPOSAL.md §2.2 core/models）：
 * - 统一的 ModelProvider 接口，屏蔽各家差异
 * - stream() 返回 AsyncIterable<StreamChunk>，跟 fetch ReadableStream 解耦
 * - StreamChunk 是协议无关的中间表示，由 core/protocols/ 进一步 reduce
 *
 * W2 范围：
 * - 接口 + 类型 ✅
 * - 6 个 provider stub（OpenAI / Anthropic / Google / DeepSeek / Qwen / Ollama）✅
 * - router 注册表 + getModelProvider() factory ✅
 * - 真实 HTTP 接入 ⏳（W3 接入真实 API Key）
 */

export { BUILTIN_MODELS, findModel, listModelsByProvider } from "./registry";
export {
  BUILTIN_PROVIDERS,
  getModelProvider,
  getProviderById,
  listAvailableModels,
} from "./router";
export type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ModelInfo,
  ModelProvider,
  ModelProviderId,
  StreamChunk,
  ToolSpec,
} from "./types";
export { ModelProviderError } from "./types";
