import { makeMockProvider } from "./mock-base";

/**
 * Qwen provider (W2 stub)。通过阿里云 DashScope 的 OpenAI 兼容端点。
 *
 * W3+ 替换为真实 `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`：
 * - 鉴权：`Authorization: Bearer ${DASHSCOPE_API_KEY}`
 * - **OpenAI 兼容**，可复用 OpenAI 请求/响应格式
 */
export const qwenProvider = makeMockProvider("qwen");
