"use client";

import { Crosshair, Layers, MousePointerClick } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LabContentPage, StatusPill } from "@/components/lab-content-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyJsonUiPatch } from "@/core/engine/json-ui/apply";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument, JsonUiNode, JsonUiPatch } from "@/core/engine/json-ui/types";
import { fetchSse } from "@/infra/http/sse-client";

/**
 * Lab 3.1.2 — 节点 Inspector（真功能）
 *
 * 选 streaming / codegen-jsonui / codegen-tsx 三种树，渲染 + onMouseEnter 触发
 * "反向高亮"，右边 Side panel 显示选中节点：
 * - path（如 /root/children/0/children/1）
 * - node type
 * - node props / children
 * - 反查：data-jsonui-path 的 DOM 节点
 *
 * 浏览器测试 hover "GenUI Labs · JSON-UI Demo" 标题会高亮 右边对应树节点。
 */

const STREAMING_DOC: JsonUiDocument = {
  root: {
    type: "card",
    props: { title: "GenUI Labs · JSON-UI Demo" },
    children: [
      { type: "text", props: { content: "hover 节点高亮对应 DSL 路径" } },
      {
        type: "flex",
        children: [
          { type: "button", props: { label: "Run" } },
          { type: "button", props: { label: "Stop", variant: "outline" } },
        ],
      },
      {
        type: "table",
        props: {
          columns: ["指标", "值"],
          rows: [
            ["测试文件", "10"],
            ["测试用例", "68"],
            ["通过率", "100%"],
          ],
        },
      },
    ],
  },
};

const CODEGEN_DOC: JsonUiDocument = {
  root: {
    type: "card",
    props: { title: "Dashboard" },
    children: [
      {
        type: "grid",
        children: [
          {
            type: "card",
            props: { title: "KPI 1" },
            children: [{ type: "text", props: { content: "Tokens: 1.2k" } }],
          },
          {
            type: "card",
            props: { title: "KPI 2" },
            children: [{ type: "text", props: { content: "Latency: 899ms" } }],
          },
        ],
      },
      { type: "text", props: { content: "生成的 UI 树" } },
    ],
  },
};

const TSX_DOC: JsonUiDocument = {
  root: {
    type: "card",
    props: { title: "TSX Sandbox" },
    children: [
      { type: "input", props: { label: "Email", placeholder: "you@x.com" } },
      { type: "input", props: { label: "Password", type: "password" } },
      { type: "button", props: { label: "Login" } },
    ],
  },
};

type TreeKey = "streaming" | "codegen" | "tsx";

const TREES: Record<TreeKey, { label: string; doc: JsonUiDocument }> = {
  streaming: { label: "Lab 1 Streaming", doc: STREAMING_DOC },
  codegen: { label: "Lab 2 Codegen (JSON-UI)", doc: CODEGEN_DOC },
  tsx: { label: "Lab 2 Codegen (TSX)", doc: TSX_DOC },
};

type NodeInfo = {
  path: string;
  type: string;
  props: Record<string, unknown>;
  childCount: number;
};

function inspectNode(doc: JsonUiDocument, path: string): NodeInfo | null {
  const segments = path.split("/").filter(Boolean);
  if (segments[0] !== "root") return null;
  let cur: JsonUiNode | undefined = doc.root;
  for (let i = 1; i < segments.length; i += 2) {
    if (segments[i] !== "children" || !cur) return null;
    const idx = Number(segments[i + 1]);
    cur = cur.children?.[idx];
  }
  if (!cur) return null;
  return {
    path,
    type: cur.type,
    props: (cur.props as Record<string, unknown>) ?? {},
    childCount: cur.children?.length ?? 0,
  };
}

function listAllPaths(doc: JsonUiDocument): string[] {
  const paths: string[] = [];
  const walk = (node: JsonUiNode | undefined, path: string) => {
    if (!node) return;
    paths.push(path);
    if (!node.children) return;
    node.children.forEach((c, i) => {
      walk(c, `${path}/children/${i}`);
    });
  };
  walk(doc.root, "/root");
  return paths;
}

export default function WorkbenchInspectorPage() {
  const [tree, setTree] = useState<TreeKey>("streaming");
  const doc = TREES[tree].doc;
  const [_patches, setPatches] = useState<JsonUiPatch[]>([]);
  const [liveDoc, setLiveDoc] = useState<JsonUiDocument>(doc);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [pinnedPath, setPinnedPath] = useState<string | null>(null);
  const [nodeLog, setNodeLog] = useState<Array<{ path: string; ts: number }>>([]);

  // 切 tree 时重置（同时把 liveDoc 设为新 tree 的 doc，触发重新渲染）
  useEffect(() => {
    setLiveDoc(TREES[tree].doc);
    setPatches([]);
    setHoveredPath(null);
    setPinnedPath(null);
    setNodeLog([]);
  }, [tree]);

  // 首次 mount 时立即把 liveDoc 替换为新对象（避免与 doc reference 相等导致 outputEmpty 误判）
  const initialTreeRef = useRef(tree);
  useEffect(() => {
    setLiveDoc(TREES[initialTreeRef.current].doc);
  }, []);

  const allPaths = useMemo(() => listAllPaths(liveDoc), [liveDoc]);
  const activePath = pinnedPath ?? hoveredPath;
  const activeInfo = activePath ? inspectNode(liveDoc, activePath) : null;

  const handleStart = async () => {
    setIsStreaming(true);
    setErrorMsg(null);
    setPatches([]);
    setLiveDoc(TREES[tree].doc);
    let cur = TREES[tree].doc;
    const acc: JsonUiPatch[] = [];
    try {
      for await (const evt of fetchSse("/api/json-ui", { body: { scenario: "default" } })) {
        let patch: JsonUiPatch;
        try {
          patch = JSON.parse(evt.data) as JsonUiPatch;
        } catch {
          continue;
        }
        cur = applyJsonUiPatch(cur, patch);
        acc.push(patch);
        setLiveDoc(cur);
        setPatches(acc);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setLiveDoc(TREES[tree].doc);
    setPatches([]);
    setHoveredPath(null);
    setPinnedPath(null);
    setNodeLog([]);
  };

  return (
    <LabContentPage
      labId="workbench"
      subNumber="3.1.2"
      title="节点 Inspector"
      protocolLabel="W7 · reverse highlight"
      description="鼠标 hover 渲染区任何节点 → 反向高亮对应 DSL 路径 + Side panel 显示节点详情。点击节点 = 钉住。"
      isStreaming={isStreaming}
      errorMsg={errorMsg}
      onStart={handleStart}
      onReset={handleReset}
      startLabel="加载真实 patch 流"
      outputEmpty={false}
      outputEmptyHint={
        <div className="text-muted-foreground/70 py-8 text-center font-mono text-[12px]">
          选树 → hover 渲染节点 → 右边反查
        </div>
      }
      outputExtra={
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <StatusPill label={`${allPaths.length} nodes`} tone="muted" />
          {hoveredPath ? <StatusPill label="hover" tone="accent" /> : null}
          {pinnedPath ? <StatusPill label="pinned" tone="success" /> : null}
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              树
            </span>
            <div className="flex gap-1">
              {(Object.keys(TREES) as TreeKey[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setTree(k)}
                  className={`rounded border px-2 py-1 font-mono text-[10.5px] transition-colors ${
                    tree === k
                      ? "border-foreground/30 bg-foreground/[0.08] text-foreground/95"
                      : "border-foreground/10 hover:border-foreground/30 text-muted-foreground/85"
                  }`}
                >
                  {TREES[k].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
      output={
        <div className="grid gap-3 lg:grid-cols-3">
          {/* 左：渲染区（hover 触发反向查找） */}
          <Card className="bg-card/30 border-foreground/5 lg:col-span-2">
            <CardHeader className="border-foreground/5 border-b p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                <Layers className="mr-1.5 inline size-3" />
                渲染区
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  hover 节点 → 反向高亮
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div
                className="rounded-md border border-dashed border-foreground/10 p-3"
                style={{
                  // cursor: crosshair,
                  minHeight: 220,
                }}
              >
                <JsonUiRenderer
                  node={liveDoc.root as JsonUiNode}
                  state={{}}
                  onHover={setHoveredPath}
                  onClick={(p) => {
                    setPinnedPath(p);
                    setNodeLog((prev) => [{ path: p, ts: Date.now() }, ...prev.slice(0, 9)]);
                  }}
                  highlightPath={activePath}
                />
              </div>
            </CardContent>
          </Card>

          {/* 右：Inspector Side Panel */}
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="border-foreground/5 border-b p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                <Crosshair className="mr-1.5 inline size-3" />
                Inspector
                <span className="text-muted-foreground/70 ml-1.5 font-normal">节点详情</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-3">
              {activeInfo ? (
                <>
                  <div>
                    <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                      path
                    </div>
                    <code className="bg-foreground/[0.06] block rounded px-2 py-1 font-mono text-[10.5px] text-foreground/90 break-all">
                      {activeInfo.path}
                    </code>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                        type
                      </div>
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                        style={{
                          backgroundColor: "oklch(0.78 0.16 230 / 0.12)",
                          color: "oklch(0.78 0.16 230)",
                        }}
                      >
                        {activeInfo.type}
                      </span>
                    </div>
                    <div>
                      <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                        children
                      </div>
                      <span className="font-mono text-[10.5px] text-foreground/85">
                        {activeInfo.childCount}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/60 mb-1 font-mono text-[9.5px] tracking-wider uppercase">
                      props
                    </div>
                    <pre className="bg-[#0d1117] border-foreground/10 max-h-48 overflow-auto rounded border p-2 font-mono text-[10px] leading-relaxed text-foreground/85">
                      {JSON.stringify(activeInfo.props, null, 2)}
                    </pre>
                  </div>
                  {pinnedPath ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPinnedPath(null)}
                      className="w-full"
                    >
                      取消 pin
                    </Button>
                  ) : null}
                </>
              ) : (
                <div className="text-muted-foreground/65 py-8 text-center font-mono text-[11px]">
                  ← hover 节点
                </div>
              )}

              {nodeLog.length > 0 ? (
                <div className="border-foreground/10 border-t pt-3">
                  <div className="text-muted-foreground/60 mb-1.5 font-mono text-[9.5px] tracking-wider uppercase">
                    最近 10 次点击
                  </div>
                  <ul className="space-y-1">
                    {nodeLog.map((n, i) => {
                      const iStr = String(i + 1).padStart(2, "0");
                      return (
                        <li
                          key={`${n.path}-${n.ts}`}
                          className="hover:bg-foreground/[0.04] flex items-center gap-2 rounded px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          <MousePointerClick className="text-muted-foreground/40 size-2.5" />
                          <span className="text-muted-foreground/50 tabular-nums">{iStr}</span>
                          <code className="text-foreground/85 truncate">{n.path}</code>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}
