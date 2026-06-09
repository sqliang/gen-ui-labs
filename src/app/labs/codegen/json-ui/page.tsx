"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument, JsonUiNode, JsonUiPatch } from "@/core/engine/json-ui/types";
import { fetchSse } from "@/infra/http/sse-client";

function applyPatch(doc: JsonUiDocument, patch: JsonUiPatch): JsonUiDocument {
  if (patch.op === "unmount") return doc;
  // 简单版：path 是 /root/children/0/children/1 → 按段写入
  // 实际应该用 lodash.set；W6 用手动版本
  const parts = patch.path.split("/").filter(Boolean); // ["root","children","0","children","1"]
  if (parts[0] !== "root") return doc;
  if (parts.length === 1) {
    doc.root = patch.value as JsonUiNode;
    return { ...doc };
  }
  // 嵌套写入：root 下按索引/字段
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

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    setPatches([]);
    let doc: JsonUiDocument = { root: { type: "text", props: { content: "加载中…" } } };
    try {
      for await (const evt of fetchSse("/api/json-ui", { body: {} })) {
        let patch: JsonUiPatch;
        try {
          patch = JSON.parse(evt.data) as JsonUiPatch;
        } catch {
          continue;
        }
        setPatches((prev) => [...prev, patch]);
        doc = applyPatch(doc, patch);
        setDoc(doc);
      }
    } catch (err) {
      doc = {
        root: {
          type: "text",
          props: { content: `错误: ${err instanceof Error ? err.message : String(err)}` },
        },
      };
      setDoc(doc);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">2.1.2 JSON-UI DSL 渲染</h1>
          <Badge variant="outline">W6 · JSON-UI Engine</Badge>
          {isLoading ? (
            <Badge variant="default" className="font-mono text-[10px]">
              loading…
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          JsonUiPatch SSE 流 → applyPatch() 增量构建 → JsonUiRenderer 递归渲染
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        <Button onClick={handleStart} disabled={isLoading}>
          {isLoading ? "加载中…" : "加载 JSON-UI"}
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">渲染结果（React 组件）</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <JsonUiRenderer node={doc.root} />
            </CardContent>
          </Card>
        </div>
        <div className="col-span-2 space-y-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-xs">Patches ({patches.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <pre className="bg-muted max-h-[20rem] overflow-auto rounded p-2 font-mono text-[9px] leading-relaxed">
                {patches.map((p, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: append-only list
                  <div key={`p-${i}`} className="border-muted border-b pb-1 mb-1">
                    <span className="text-primary font-bold">{p.op}</span> {p.path}
                  </div>
                ))}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-xs">Doc JSON</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <pre className="bg-muted max-h-[15rem] overflow-auto rounded p-2 font-mono text-[9px] leading-relaxed">
                {JSON.stringify(doc, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
