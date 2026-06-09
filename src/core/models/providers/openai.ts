import { makeMockProvider } from "./mock-base";

/**
 * OpenAI provider (W2 stub)。
 *
 * W3+ 替换为真实 `https://api.openai.com/v1/chat/completions`：
 * - 鉴权：`Authorization: Bearer ${OPENAI_API_KEY}`
 * - 流式：`"stream": true` 返回 SSE，每行 `data: {...}` JSON
 * - chunk 形如 `{choices: [{delta: {content: "..."}}]}`
 */
export const openaiProvider = makeMockProvider("openai");
