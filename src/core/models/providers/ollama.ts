import { makeMockProvider } from "./mock-base";

/**
 * Ollama provider (W2 stub)。本地 LLM 推理。
 *
 * W3+ 替换为真实 `http://localhost:11434/api/chat`：
 * - 鉴权：无（本地服务）
 * - 流式：body 加 `"stream": true`，每行 NDJSON `{message: {content: "..."}, done: false}`
 * - 注意：Ollama 的流式是 NDJSON 不是 SSE，需要在 client 端解析
 */
export const ollamaProvider = makeMockProvider("ollama");
