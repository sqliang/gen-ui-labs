/* biome-ignore-all lint/a11y/noStaticElementInteractions: hover sentinel on tree wrapper */
/* biome-ignore-all lint/suspicious/noArrayIndexKey: path-prefixed keys are stable */

"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LabContentPage, StatusPill } from "@/components/lab-content-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyJsonUiPatch } from "@/core/engine/json-ui/apply";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument, JsonUiNode, JsonUiPatch } from "@/core/engine/json-ui/types";
import { useLabActions } from "@/lib/use-lab-actions";

type InspectorTab = "streaming" | "json-ui" | "tsx";

const TAB_TREES: Record<InspectorTab, JsonUiDocument> = {
  streaming: {
    root: {
      type: "card",
      props: { title: "Streaming · protocol renderer" },
      children: [
        { type: "text", props: { content: "Markdown / AG-UI / A2UI 三种协议对比" } },
        {
          type: "flex",
          props: { direction: "row", gap: 2 },
          children: [
            { type: "card", props: { title: "evts: 12" } },
            { type: "card", props: { title: "tokens: 428" } },
            { type: "card", props: { title: "cost: 0.0019" } },
          ],
        },
      ],
    },
  },
  "json-ui": {
    root: {
      type: "card",
      props: { title: "JSON-UI · DSL renderer" },
      children: [
        {
          type: "table",
          props: {
            columns: ["指标", "值"],
            rows: [
              ["渲染节点", 4],
              ["sandbox", "off"],
              ["type safe", "100%"],
              ["a11y", "ok"],
            ],
          },
        },
        { type: "text", props: { content: "hover/click 节点高亮 reverse" } },
      ],
    },
  },
  tsx: {
    root: {
      type: "card",
      props: { title: "TSX · runtime sandbox" },
      children: [
        { type: "text", props: { content: "sandbox 内执行 React component" } },
        {
          type: "flex",
          props: { direction: "row", gap: 2 },
          children: [
            { type: "card", props: { title: "iframe: ok" } },
            { type: "card", props: { title: "sandbox: on" } },
          ],
        },
      ],
    },
  },
};

const TAB_LABELS: Record<InspectorTab, string> = {
  streaming: "Streaming",
  "json-ui": "JSON-UI",
  tsx: "TSX",
};

type NodeRecord = {
  path: string;
  type: string;
  children?: string[];
  props?: Record<string, unknown>;
};

export default function InspectorPage() {
  const [tab, setTab] = useState<InspectorTab>("streaming");
  const [liveDoc, setLiveDoc] = useState<JsonUiDocument>(() =>
    structuredClone(TAB_TREES.streaming),
  );
  const [patches, setPatches] = useState<JsonUiPatch[]>([]);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [pinnedPath, setPinnedPath] = useState<string | null>(null);
  const [nodeLog, setNodeLog] = useState<Array<{ path: string; ts: number }>>([]);

  // 切 tab 时重置
  useEffect(() => {
    setLiveDoc(structuredClone(TAB_TREES[tab]));
    setPatches([]);
    setHoveredPath(null);
    setPinnedPath(null);
  }, [tab]);

  // 模拟 push patch 流：mounted → text update → button click → unmount
  const handleStart = () => {
    const cur = liveDoc;
    const next1 = applyJsonUiPatch(cur, {
      op: "mount",
      path: "/root/children/0",
      value: { type: "text", props: { content: `Inspector mounted · t=${Date.now()}` } },
    });
    setLiveDoc(next1);
    setPatches((p) => [
      ...p,
      {
        op: "mount",
        path: "/root/children/0",
        value: { type: "text", props: { content: "(see live)" } },
      },
    ]);
    setHoveredPath("/root/children/0");
    setPinnedPath("/root/children/0");
    setNodeLog((l) => [{ path: "/root/children/0", ts: Date.now() }, ...l].slice(0, 10));
  };

  const handleReset = () => {
    setLiveDoc(structuredClone(TAB_TREES[tab]));
    setPatches([]);
    setHoveredPath(null);
    setPinnedPath(null);
  };

  const handleExportJson = () => {
    const dump = {
      version: 1,
      generatedAt: new Date().toISOString(),
      tab,
      liveDoc,
      patches,
      selected: pinnedPath ?? hoveredPath,
      nodeLog,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspector-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useLabActions({
    onStart: handleStart,
    onReset: handleReset,
  });

  // 选中的节点：从 liveDoc 走 path 找
  const selectedNode = useMemo(() => {
    const path = pinnedPath ?? hoveredPath;
    if (!path) return null;
    return walkNode(liveDoc.root, path);
  }, [liveDoc, pinnedPath, hoveredPath]);

  return (
    <LabContentPage
      labId="workbench"
      subNumber="3.1.2"
      title="节点 Inspector"
      protocolLabel="W6 · node detail"
      description="reverse lookup 节点：hover/click JSON-UI tree 节点 → 右栏 Inspector 显示 path/type/children/props。pinned state 持久保留最近选中。"
      isStreaming={false}
      onStart={handleStart}
      onReset={handleReset}
      startLabel="mount 示例节点"
      outputTitle="inspector · tree reverse lookup"
      outputExtra={
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <StatusPill label={`${patches.length} patches`} tone="muted" />
          {pinnedPath ? <StatusPill label="pinned" tone="success" /> : null}
          <button
            type="button"
            onClick={handleExportJson}
            disabled={liveDoc === TAB_TREES[tab]}
            className="text-muted-foreground/85 hover:text-foreground/95 ml-2 flex items-center gap-1.5 rounded border border-foreground/10 px-2 py-0.5 font-mono text-[10px] transition-colors disabled:opacity-40"
          >
            <Download className="size-3" />
            export .json
          </button>
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              tab
            </span>
            <div className="flex gap-1">
              {(Object.keys(TAB_TREES) as InspectorTab[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    tab === t
                      ? "rounded border border-foreground/30 bg-foreground/[0.08] px-2 py-0.5 font-mono text-[10px] text-foreground/95"
                      : "rounded border border-foreground/10 px-2 py-0.5 font-mono text-[10px] text-muted-foreground/85 hover:border-foreground/30"
                  }
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
      output={
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                json-ui tree
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  ({TAB_LABELS[tab]})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div
                className="border-foreground/10 max-h-[28rem] overflow-auto rounded border p-2"
                onMouseLeave={() => setHoveredPath(null)}
              >
                <TreeView
                  node={liveDoc.root}
                  path="/root"
                  depth={0}
                  hoveredPath={hoveredPath}
                  pinnedPath={pinnedPath}
                  onHover={setHoveredPath}
                  onClick={(p) => {
                    setPinnedPath(p === pinnedPath ? null : p);
                    setNodeLog((l) => [{ path: p, ts: Date.now() }, ...l].slice(0, 10));
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                node inspector
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {selectedNode ? (
                <div className="space-y-2 font-mono text-[10.5px]">
                  <Row label="path">
                    <code className="text-sky-300">{pinnedPath ?? hoveredPath}</code>
                  </Row>
                  <Row label="type">
                    <span className="text-emerald-300">{selectedNode.type}</span>
                  </Row>
                  {selectedNode.children ? (
                    <Row label="children">
                      <span className="text-muted-foreground/85">
                        [{selectedNode.children.join(", ")}]
                      </span>
                    </Row>
                  ) : null}
                  <Row label="props">
                    <pre className="bg-[#0d1117] border-foreground/10 max-h-[16rem] overflow-auto rounded border p-2">
                      {JSON.stringify(selectedNode.props ?? {}, null, 2)}
                    </pre>
                  </Row>
                </div>
              ) : (
                <p className="text-muted-foreground/70 py-6 text-center font-mono text-[10.5px]">
                  点击左侧节点 → 详情出现
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                渲染预览
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="border-foreground/10 max-h-[28rem] overflow-auto rounded border p-2">
                <JsonUiRenderer node={liveDoc.root} />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground/70 text-[9.5px] tracking-wider uppercase">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function TreeView({
  node,
  path,
  depth,
  hoveredPath,
  pinnedPath,
  onHover,
  onClick,
}: {
  node: JsonUiNode;
  path: string;
  depth: number;
  hoveredPath: string | null;
  pinnedPath: string | null;
  onHover: (p: string | null) => void;
  onClick: (p: string) => void;
}) {
  const isHover = hoveredPath === path;
  const isPinned = pinnedPath === path;
  const childList = node.children ?? [];
  return (
    <div>
      <div
        className={
          isPinned
            ? "bg-sky-500/10 -mx-1 rounded px-1 ring-1 ring-sky-500/30"
            : isHover
              ? "bg-foreground/[0.06] -mx-1 rounded px-1"
              : "-mx-1 rounded px-1 hover:bg-foreground/[0.04]"
        }
        style={{ marginLeft: depth * 12 }}
        onMouseEnter={() => onHover(path)}
        onClick={() => onClick(path)}
        role="treeitem"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(path);
          }
        }}
      >
        <span className="text-muted-foreground/60">{"\u00b7".repeat(depth)}</span>
        <span className="ml-1 text-emerald-300">{node.type}</span>
        {node.props?.title ? (
          <span className="text-muted-foreground/85 ml-1.5">
            &quot;{String(node.props.title)}&quot;
          </span>
        ) : null}
      </div>
      {childList.map((c: JsonUiNode, i: number) => {
        const cp = `${path}/children/${i}`;
        return (
          <TreeView
            key={`${path}-${i}`}
            node={c}
            path={cp}
            depth={depth + 1}
            hoveredPath={hoveredPath}
            pinnedPath={pinnedPath}
            onHover={onHover}
            onClick={onClick}
          />
        );
      })}
    </div>
  );
}

/** Walk tree by path segments like /root/children/0/children/2 */
function walkNode(node: JsonUiNode, path: string): NodeRecord | null {
  const segments = path.split("/").filter(Boolean);
  let cur: JsonUiNode = node;
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    if (!seg) continue;
    if (seg === "root") continue;
    if (seg === "children") {
      const idx = Number.parseInt(segments[i + 1] ?? "", 10);
      if (Number.isNaN(idx)) return null;
      const child = cur.children?.[idx];
      if (!child) return null;
      cur = child;
      i += 1;
      continue;
    }
    return null;
  }
  return {
    path,
    type: cur.type,
    children: cur.children?.map((_, i) => `children/${i}`),
    props: cur.props,
  };
}
