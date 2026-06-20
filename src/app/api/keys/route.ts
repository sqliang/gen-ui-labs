/**
 * /api/keys 端点（dev 专用）。
 *
 * 告诉前端每个 provider 的 key 是否配置好。
 * 只读 `process.env` 不返回 key 本身（安全），只返回 presence。
 *
 * 为什么放在服务端？
 * - 前端 JS bundle 不会拿到 `process.env` 之外的值（除非 NEXT_PUBLIC_）
 * - 让用户在 /settings 看到每个 provider 的真实状态
 *
 * 注意：production build 也会跑；这是非敏感诊断信息。
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ProviderStatus {
  provider: string;
  label: string;
  configured: boolean;
  envVar: string;
  note?: string;
}

const PROVIDERS: ProviderStatus[] = [
  {
    provider: "openai",
    label: "OpenAI",
    configured: Boolean(process.env.OPENAI_API_KEY),
    envVar: "OPENAI_API_KEY",
    note: "get key → platform.openai.com",
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    configured: Boolean(process.env.ANTHROPIC_API_KEY),
    envVar: "ANTHROPIC_API_KEY",
    note: "get key → console.anthropic.com",
  },
  {
    provider: "google",
    label: "Google (Gemini)",
    configured: Boolean(process.env.GOOGLE_API_KEY),
    envVar: "GOOGLE_API_KEY",
    note: "get key → aistudio.google.com",
  },
  {
    provider: "deepseek",
    label: "DeepSeek",
    configured: Boolean(process.env.DEEPSEEK_API_KEY),
    envVar: "DEEPSEEK_API_KEY",
    note: "get key → platform.deepseek.com",
  },
  {
    provider: "qwen",
    label: "Qwen (DashScope)",
    configured: Boolean(process.env.QWEN_API_KEY),
    envVar: "QWEN_API_KEY",
    note: "get key → dashscope.aliyun.com",
  },
  {
    provider: "ollama",
    label: "Ollama (local)",
    configured: true, // 本地不需要 key
    envVar: "OLLAMA_HOST",
    note: "no key required · set OLLAMA_HOST if not on localhost:11434",
  },
];

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      providers: PROVIDERS,
      summary: {
        total: PROVIDERS.length,
        configured: PROVIDERS.filter((p) => p.configured).length,
      },
    },
    {
      headers: {
        "cache-control": "no-store, must-revalidate",
      },
    },
  );
}
