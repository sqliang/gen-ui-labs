/**
 * /api/health 端点。
 *
 * 给 site-header status 点 / 监控系统用。
 * 永远 200，返回 {ok: true, ts, version, labs}。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { LABS } from "@/core/labs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PackageJson {
  version: string;
}

let cachedVersion: string | null = null;
function getVersion(): string {
  if (cachedVersion !== null) return cachedVersion;
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as PackageJson;
    cachedVersion = pkg.version;
    return cachedVersion;
  } catch {
    cachedVersion = "0.0.0";
    return cachedVersion;
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      version: getVersion(),
      labs: LABS.length,
    },
    {
      headers: { "cache-control": "no-store, must-revalidate" },
    },
  );
}
