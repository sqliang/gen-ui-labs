/**
 * /api/models 端点。
 *
 * 返回所有 builtin models + 当前 user 选中的 model。
 * 给 site-header model switcher 兜底（避免循环 import）。
 */

import { NextResponse } from "next/server";

import { BUILTIN_MODELS } from "@/core/models/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      models: BUILTIN_MODELS,
      providers: Array.from(new Set(BUILTIN_MODELS.map((m) => m.provider))),
      summary: {
        total: BUILTIN_MODELS.length,
        providers: new Set(BUILTIN_MODELS.map((m) => m.provider)).size,
      },
    },
    {
      headers: { "cache-control": "no-store, must-revalidate" },
    },
  );
}
