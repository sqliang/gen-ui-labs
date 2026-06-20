"use client";

import { useCallback, useState } from "react";

import { LabContentPage } from "@/components/lab-content-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument, JsonUiNode, JsonUiPatch } from "@/core/engine/json-ui/types";
import { fetchSse } from "@/infra/http/sse-client";

function applyPatch(doc: JsonUiDocument, patch: JsonUiPatch): JsonUiDocument {
  if (patch.op === "unmount") return doc;
  const parts = patch.path.split("/").filter(Boolean);
  if (parts[0] !== "root") return doc;
  if (parts.length === 1) {
    doc.root = patch.value as JsonUiNode;
    return { ...doc };
  }
  let current: Record<string, unknown> = doc.root as unknown as Record<string, unknown>;
  for (let i = 1; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!key) break;
    const next = current[key] as Record<string, unknown> | undefined;
    if (!next) break;
    current = next;
  }
  const lastKey = parts[parts.length - 1];
  if (lastKey) current[lastKey] = patch.value;
  return { ...doc, root: { ...doc.root } };
}

export default function JsonUiPage() {
  const [doc, setDoc] = useState<JsonUiDocument>({
    root: { type: "text", props: { content: "点击「开始」加载 JSON-UI" } },
  });
  const [patches, setPatches] = useState<JsonUiPatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setPatches([]);
    let cur: JsonUiDocument = {
      root: { type: "text", props: { content: "加载中…" } },
    };
    try {
      for await (const evt of fetchSse("/api/json-ui", { body: {} })) {
        let patch: JsonUiPatch;
        try {
          patch = JSON.parse(evt.data) as JsonUiPatch;
        } catch {
          continue;
        }
        setPatches((prev) => [...prev, patch]);
        cur = applyPatch(cur, patch);
        setDoc(cur);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      cur = {
        root: {
          type: "text",
          props: { content: `错误: ${msg}` },
        },
      };
      setDoc(cur);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <LabContentPage
      labId="codegen"
      subNumber="2.1.2"
      title="JSON-UI DSL 渲染"
      protocolLabel="W6 · JSON-UI Engine"
      description="JsonUiPatch SSE 流 → applyPatch() 增量构建 → JsonUiRenderer 递归渲染。W6 引擎支持 card / table / button / text / flex / grid / chart / input。"
      isStreaming={isLoading}
      errorMsg={errorMsg}
      onStart={handleStart}
      startLabel="加载 JSON-UI"
      outputTitle="json-ui · live document"
      outputExtra={
        <>
          <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
            {patches.length} patches
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
            {Object.keys(doc.root).length} fields
          </span>
        </>
      }
      output={
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* 左：渲染结果 */}
          <div className="lg:col-span-3">
            <Card className="bg-card/30 border-foreground/5 h-full">
              <CardHeader className="p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  rendered
                  <span className="text-muted-foreground/70 ml-1.5 font-normal">(React 组件)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <JsonUiRenderer node={doc.root} />
              </CardContent>
            </Card>
          </div>

          {/* 右：Patches + Doc JSON */}
          <div className="space-y-3 lg:col-span-2">
            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  patches
                  <span className="text-muted-foreground/70 ml-1.5 font-normal">
                    ({patches.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <pre className="bg-[#0d1117] border-foreground/10 max-h-[18rem] overflow-auto rounded-md border p-3 font-mono text-[10px] leading-relaxed text-foreground/85">
                  {patches.length > 0
                    ? patches.map((p) => (
                        <div
                          key={`${p.op}-${p.path}`}
                          className="border-foreground/10 border-b pb-1 mb-1 last:border-0"
                        >
                          <span className="font-bold text-sky-300">{p.op}</span>{" "}
                          <span className="text-muted-foreground/85">{p.path}</span>
                        </div>
                      ))
                    : "（点击「加载 JSON-UI」）"}
                </pre>
              </CardContent>
            </Card>

            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  doc json
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <pre className="bg-[#0d1117] border-foreground/10 max-h-[14rem] overflow-auto rounded-md border p-3 font-mono text-[10px] leading-relaxed text-foreground/85">
                  {JSON.stringify(doc, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    />
  );
}
