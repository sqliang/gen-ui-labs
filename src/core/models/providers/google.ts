import { makeMockProvider } from "./mock-base";

/**
 * Google Gemini provider (W2 stub)。
 *
 * W3+ 替换为真实 `https://generativelanguage.googleapis.com/v1beta/...:streamGenerateContent`：
 * - 鉴权：`?key=${GOOGLE_API_KEY}` query string
 * - 流式：URL 末尾加 `?alt=sse`
 * - chunk 形如 `{candidates: [{content: {parts: [{text: "..."}]}}]}`
 */
export const googleProvider = makeMockProvider("google");
