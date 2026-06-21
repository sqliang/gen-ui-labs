"use client";

import { useCallback, useReducer, useState } from "react";

import { LabContentPage } from "@/components/lab-content-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyJsonUiPatch } from "@/core/engine/json-ui/apply";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument, JsonUiPatch } from "@/core/engine/json-ui/types";
import { fetchSse } from "@/infra/http/sse-client";
import { useLabActions } from "@/lib/use-lab-actions";
import { useLogSession } from "@/lib/use-log-session";

/** bindingState 的 reducer —— 支持 dataModelUpdate patch 改值 */
type BindingAction = { type: "toggle_user_name" } | { type: "set"; path: string; value: unknown };

function bindingReducer(
  state: Record<string, unknown>,
  action: BindingAction,
): Record<string, unknown> {
  if (action.type === "toggle_user_name") {
    const user = (state.user as { name?: string } | undefined) ?? {};
    return {
      ...state,
      user: {
        ...user,
        name: user.name === "Alice" ? "Bob" : "Alice",
      },
    };
  }
  // set { path: '/user/name', value: 'Carol' }
  const parts = action.path.split("/").filter(Boolean);
  if (parts.length === 0) return state;
  // 浅合并：最多 2 层（a.b）
  const next: Record<string, unknown> = { ...state };
  if (parts.length === 1) {
    next[parts[0] as string] = action.value;
  } else if (parts.length === 2) {
    const parent = next[parts[0] as string];
    next[parts[0] as string] = {
      ...((parent as object) ?? {}),
      [parts[1] as string]: action.value,
    };
  }
  return next;
}

const INITIAL_BINDING: Record<string, unknown> = {
  user: { name: "Alice" },
  lab: "JSON-UI",
  version: "0.1.0",
  lastUpdated: "2026-06-20",
};
export default function JsonUiPage() {
  const [doc, setDoc] = useState<JsonUiDocument>({
    root: { type: "text", props: { content: "点击「开始」加载 JSON-UI" } },
  });
  const [patches, setPatches] = useState<JsonUiPatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // session 完成后写入 sessionsLog
  const { markStart, logSession } = useLogSession({
    lab: "codegen",
    protocol: "DSL",
    getTitle: () => `JSON-UI dashboard · ${patches.length} patches`,
    getTokens: () => patches.length * 14,
  });

  const [bindingState, dispatchBinding] = useReducer(bindingReducer, INITIAL_BINDING);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setPatches([]);
    markStart();
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
        cur = applyJsonUiPatch(cur, patch);
        setDoc(cur);
        // 模拟 dataModelUpdate 改 binding state 的副作用
        if (patch.op === "patch" && patch.path.includes("/props/title")) {
          // 例子：patches 改 title 包含 user.name —— 实际真生产用 SSE 推 dataModelUpdate
        }
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
      logSession();
    }
  }, [logSession, markStart]);

  const handleReset = useCallback(() => {
    setIsLoading(false);
    setErrorMsg(null);
    setPatches([]);
    setDoc({
      root: { type: "text", props: { content: "点击「开始」加载 JSON-UI" } },
    });
  }, []);

  // ⌘K action 监听：run / reset
  useLabActions({ onStart: handleStart, onReset: handleReset });

  // 模拟后端推 dataModelUpdate：批量 dispatch 几个 patch
  const simulateDataModelUpdate = useCallback(() => {
    const updates: Array<{ path: string; value: unknown }> = [
      { path: "/user/name", value: "Carol" },
      { path: "/lastUpdated", value: new Date().toISOString().slice(0, 10) },
    ];
    for (const u of updates) {
      dispatchBinding({ type: "set", path: u.path, value: u.value });
    }
    // 同步到 patches 列表（模拟真 SSE）
    for (const u of updates) {
      const patch: JsonUiPatch = { op: "patch", path: u.path, value: u.value };
      setPatches((prev) => [...prev, patch]);
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
                <div className="space-y-3">
                  {/* binding state 操作面板 */}
                  <div className="border-foreground/10 bg-foreground/[0.03] space-y-2 rounded-md border p-2.5">
                    <div className="text-muted-foreground/60 font-mono text-[9.5px] tracking-wider uppercase">
                      binding state · 表达式数据源
                    </div>
                    <pre className="bg-[#0d1117] border-foreground/10 max-h-32 overflow-auto rounded border p-2 font-mono text-[10.5px] leading-relaxed text-foreground/85">
                      {JSON.stringify(bindingState, null, 2)}
                    </pre>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => dispatchBinding({ type: "toggle_user_name" })}
                        className="border-foreground/20 hover:border-foreground/40 rounded border px-2 py-1 font-mono text-[10px] transition-colors"
                      >
                        toggle user.name
                      </button>
                      <button
                        type="button"
                        onClick={simulateDataModelUpdate}
                        className="border-foreground/20 hover:border-foreground/40 rounded border px-2 py-1 font-mono text-[10px] transition-colors"
                      >
                        ⚡ dataModelUpdate (模拟 SSE)
                      </button>
                    </div>
                  </div>
                  {/* 渲染区 */}
                  <JsonUiRenderer node={doc.root} state={bindingState} />
                </div>
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
