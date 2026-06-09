import { makeMockProvider } from "./mock-base";

/**
 * Anthropic provider (W2 stub)。
 *
 * W3+ 替换为真实 `https://api.anthropic.com/v1/messages`：
 * - 鉴权：`x-api-key: ${ANTHROPIC_API_KEY}` + `anthropic-version: 2023-06-01`
 * - 流式：`"stream": true` 返回 SSE 事件流
 * - 事件类型：`message_start` / `content_block_start` / `content_block_delta` /
 *   `content_block_stop` / `message_delta` / `message_stop`
 */
export const anthropicProvider = makeMockProvider("anthropic");
