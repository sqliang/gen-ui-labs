"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILTIN_MODELS } from "@/core/models/registry";

interface ProviderStatus {
  provider: string;
  label: string;
  configured: boolean;
  envVar: string;
  note?: string;
}

interface KeysResponse {
  providers: ProviderStatus[];
  summary: { total: number; configured: number };
}

/**
 * /settings/models
 *
 * 让用户看到：
 * 1. 13 个模型按 provider 分组
 * 2. 每个 provider 的 key 是否已配（用 /api/keys 端点）
 * 3. 没配 key 的话给出 get key 的链接
 * 4. 当前选中的模型
 */
export default function ModelsSettingsPage() {
  const [status, setStatus] = useState<KeysResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/keys", { cache: "no-store" })
      .then((r) => r.json() as Promise<KeysResponse>)
      .then((d) => {
        if (!cancelled) {
          setStatus(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const providerMap = new Map<string, ProviderStatus>();
  if (status) {
    for (const p of status.providers) {
      providerMap.set(p.provider, p);
    }
  }

  // 按 provider 分组 models
  const grouped: Record<string, typeof BUILTIN_MODELS> = {};
  for (const m of BUILTIN_MODELS) {
    const bucket = grouped[m.provider] ?? [];
    bucket.push(m);
    grouped[m.provider] = bucket;
  }

  return (
    <div className="space-y-6">
      {/* summary */}
      <Card className="border-foreground/10 bg-card/40">
        <CardHeader className="p-3.5">
          <CardTitle className="text-foreground/95 text-[12.5px] font-medium">
            providers · 状态总览
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3.5 pt-0 pb-3.5">
          {loading ? (
            <p className="text-muted-foreground/70 font-mono text-[11px]">
              loading from /api/keys…
            </p>
          ) : status ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {status.providers.map((p) => (
                <div
                  key={p.provider}
                  className="border-foreground/10 bg-background/40 flex items-center justify-between rounded-md border px-2.5 py-1.5"
                >
                  <div>
                    <div className="text-foreground/90 font-mono text-[12px]">{p.label}</div>
                    <div className="text-muted-foreground/60 font-mono text-[10px]">{p.envVar}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-1.5 rounded-full ${
                        p.configured
                          ? "bg-emerald-500 shadow-[0_0_6px_oklch(0.7_0.18_150)]"
                          : "bg-zinc-500"
                      }`}
                    />
                    <span className="text-muted-foreground/85 font-mono text-[10px]">
                      {p.configured ? "ready" : "missing"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground/70 font-mono text-[11px]">
              could not reach /api/keys
            </p>
          )}

          {status ? (
            <p className="text-muted-foreground/60 mt-3 font-mono text-[10.5px]">
              {status.summary.configured}/{status.summary.total} providers ready · .env.local in
              project root (gitignored)
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* models per provider */}
      <Card className="border-foreground/10 bg-card/40">
        <CardHeader className="p-3.5">
          <CardTitle className="text-foreground/95 text-[12.5px] font-medium">
            {BUILTIN_MODELS.length} models · {Object.keys(grouped).length} providers
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3.5 pt-0 pb-3.5">
          <div className="space-y-4">
            {Object.entries(grouped).map(([provider, models]) => {
              const prov = providerMap.get(provider);
              const ready = prov?.configured ?? true;
              return (
                <div key={provider}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-foreground/90 font-mono text-[12px] font-medium">
                      {prov?.label ?? provider}
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[9.5px] ${
                        ready
                          ? "border-emerald-500/40 text-emerald-300/90"
                          : "border-amber-500/40 text-amber-300/90"
                      }`}
                    >
                      {ready ? "ready" : "key missing"}
                    </Badge>
                    {prov?.note ? (
                      <a
                        href={noteUrl(prov.envVar)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-muted-foreground/60 hover:text-foreground ml-auto font-mono text-[10px] transition-colors"
                      >
                        get key ↗
                      </a>
                    ) : null}
                  </div>
                  <div className="border-foreground/5 overflow-hidden rounded-md border">
                    {models.map((m) => (
                      <div
                        key={m.id}
                        className="hover:bg-foreground/[0.02] flex items-center gap-3 border-foreground/5 border-b px-3 py-1.5 transition-colors last:border-b-0"
                      >
                        <code className="text-foreground/90 flex-1 font-mono text-[11.5px]">
                          {m.id}
                        </code>
                        <span className="text-muted-foreground/60 font-mono text-[10px]">
                          {(m.contextWindow / 1000).toFixed(0)}k ctx
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* env example */}
      <Card className="border-foreground/10 bg-card/40">
        <CardHeader className="p-3.5">
          <CardTitle className="text-foreground/95 text-[12.5px] font-medium">
            .env.local · 模板
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3.5 pt-0 pb-3.5">
          <pre className="bg-[#0d1117] border-foreground/10 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed text-foreground/85">
            <span className="text-muted-foreground/50"># 真实 SSE 已用</span>
            {"\n"}DEEPSEEK_API_KEY=sk-your-deepseek-key
            {"\n\n"}
            <span className="text-muted-foreground/50"># 可选</span>
            {"\n"}OPENAI_API_KEY=sk-your-openai-key
            {"\n"}ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
            {"\n"}GOOGLE_API_KEY=your-google-key
            {"\n"}QWEN_API_KEY=sk-your-qwen-key
            {"\n\n"}
            <span className="text-muted-foreground/50"># 本地</span>
            {"\n"}OLLAMA_HOST=http://localhost:11434
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

/** 把 env var 映射到对应的"get key"链接 */
function noteUrl(envVar: string): string {
  const map: Record<string, string> = {
    OPENAI_API_KEY: "https://platform.openai.com/api-keys",
    ANTHROPIC_API_KEY: "https://console.anthropic.com/settings/keys",
    GOOGLE_API_KEY: "https://aistudio.google.com/apikey",
    DEEPSEEK_API_KEY: "https://platform.deepseek.com/api_keys",
    QWEN_API_KEY: "https://dashscope.console.aliyun.com/apiKey",
  };
  return map[envVar] ?? "https://github.com/sqliang/gen-ui-labs";
}
