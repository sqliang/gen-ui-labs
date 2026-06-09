/**
 * /api/chat 路由的 Zod schema。
 *
 * 为什么用 Zod：
 * - 客户端发 `{model: 123}` 这种错类型时，TypeScript `as ChatRequest` 会盲信，
 *   错会延后到 provider.stream 内部才抛
 * - 真实 provider（W3+）会基于 Zod 校验失败立即返回 400，避免浪费 API 配额
 * - 错误信息可以精准告诉用户哪个字段坏了
 */

import { z } from "zod";

const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("system"), content: z.string() }),
  z.object({ role: z.literal("user"), content: z.string() }),
  z.object({ role: z.literal("assistant"), content: z.string() }),
  z.object({
    role: z.literal("tool"),
    content: z.string(),
    toolCallId: z.string(),
  }),
]);

export const chatRequestSchema = z.object({
  model: z.string().min(1, "model is required"),
  messages: z.array(chatMessageSchema).min(1, "messages must not be empty"),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
  tools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.record(z.string(), z.unknown()),
      }),
    )
    .optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
