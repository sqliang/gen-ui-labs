/**
 * Anthropic provider（W3 mock，W4+ 接真实 Messages API）。
 *
 * Anthropic 用自家协议：
 *   POST https://api.anthropic.com/v1/messages
 *   headers: x-api-key, anthropic-version
 *   body: { model, messages, max_tokens, stream: true }
 *   SSE: event: content_block_delta / message_delta ...
 *
 * W4 落地。届时这个文件会变成一个 AnthropicProvider implements ModelProvider。
 */

import { makeMockProvider } from "./mock-base";

export const anthropicProvider = makeMockProvider("anthropic");
