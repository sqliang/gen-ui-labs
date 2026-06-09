/**
 * Google Gemini provider（W3 mock，W4+ 接真实 generateContent API）。
 *
 * 走自家协议：
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent
 *   ?key={API_KEY}
 *   body: { contents: [{ role, parts: [{ text }] }] }
 *   SSE: 嵌套 JSON（不是标准 SSE）
 *
 * W4 落地。届时需要一个专门的 GeminiProvider 类 + 自定义 SSE 解析。
 */

import { makeMockProvider } from "./mock-base";

export const googleProvider = makeMockProvider("google");
