import { makeMockProvider } from "./mock-base";

/**
 * DeepSeek provider (W2 stub)。
 *
 * W3+ 替换为真实 `https://api.deepseek.com/chat/completions`：
 * - 鉴权：`Authorization: Bearer ${DEEPSEEK_API_KEY}`
 * - **OpenAI 兼容接口**，可以直接复用 OpenAI 的请求/响应格式
 */
export const deepseekProvider = makeMockProvider("deepseek");
