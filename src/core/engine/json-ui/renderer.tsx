"use client";

import { createContext, type JSX, useContext } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { evaluateJsonUiNode } from "./expr";
import type { JsonUiNode } from "./types";

/**
 * JSON-UI → React 递归渲染器。
 *
 * 特性：
 * - 表达式求值：DSL 字符串里写 `{user.name}` → state.user.name
 * - 节点路径注入：每个节点挂 `data-jsonui-path`（如 `/root/children/0`），供 Inspector 反向查找
 * - 路径上下文通过 React Context 传递，避免每层手动算 path
 *
 * W6 范围：card / button / text / table / flex / grid / chart / input。
 */

type PathContext = {
  /** 当前节点的完整 path（从 root 算起） */
  path: string;
  /** 当节点被 hover 时回调（path） */
  onHover?: (path: string) => void;
  /** 当节点被点击时回调（path） */
  onClick?: (path: string) => void;
  /** 高亮目标 path（与当前节点 path 一致时加 ring） */
  highlightPath?: string | null;
  /** 按 path 查 outline 类名（用于 heatmap / inspector 高亮） */
  outlineForPath?: (path: string) => string | undefined;
};

const PathCtx = createContext<PathContext | null>(null);

function buildPath(parent: string, key: string | number): string {
  if (typeof key === "number") return `${parent}/children/${key}`;
  return `${parent}/${key}`;
}

function PathWrap({
  path,
  children,
  className,
  highlight,
}: {
  path: string;
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  const ctx = useContext(PathCtx);
  const outlineClass = ctx?.outlineForPath?.(path);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: DSL node click triggers Inspector select
    // biome-ignore lint/a11y/useKeyWithClickEvents: hover-only intent; click optional via Inspector
    <div
      role={ctx?.onClick || ctx?.onHover ? "treeitem" : undefined}
      tabIndex={ctx?.onClick ? 0 : undefined}
      data-jsonui-path={path}
      onMouseEnter={() => ctx?.onHover?.(path)}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        ctx?.onClick?.(path);
      }}
      className={className}
      style={
        highlight
          ? {
              outline: "1px solid var(--lab-accent, currentColor)",
              outlineOffset: 2,
              borderRadius: 4,
            }
          : undefined
      }
    >
      {outlineClass ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded ${outlineClass}`}
          style={{ zIndex: 1 }}
        />
      ) : null}
      {children}
    </div>
  );
}

function ChildrenRenderer({
  nodes,
  state,
  parentPath,
}: {
  nodes: JsonUiNode[];
  state: unknown;
  parentPath: string;
}): JSX.Element {
  const ctx = useContext(PathCtx);
  const evalChildren = nodes.map((c) => evaluateJsonUiNode(c, state));
  return (
    <>
      {evalChildren.map((child, i) => {
        const childPath = buildPath(parentPath, i);
        return (
          <PathCtx.Provider
            key={child.id ?? `child-${i}`}
            value={ctx ? { ...ctx } : { path: childPath }}
          >
            <JsonUiRendererCore node={child} state={state} path={childPath} />
          </PathCtx.Provider>
        );
      })}
    </>
  );
}

function renderChildren(
  children: JsonUiNode[] | undefined,
  state: unknown,
  parentPath: string,
): JSX.Element | null {
  if (!children || children.length === 0) return null;
  return <ChildrenRenderer nodes={children} state={state} parentPath={parentPath} />;
}

function JsonUiRendererCore({
  node,
  state,
  path,
}: {
  node: JsonUiNode;
  state: unknown;
  path: string;
}): JSX.Element {
  const ctx = useContext(PathCtx);
  const evaluated = evaluateJsonUiNode(node, state);
  const p = evaluated.props ?? {};
  const isHighlighted = ctx?.highlightPath === path;
  const wrap = (children: React.ReactNode, key?: string) => (
    <PathWrap key={key} path={path} className={undefined} highlight={isHighlighted}>
      {children}
    </PathWrap>
  );

  switch (node.type) {
    case "card":
      return wrap(
        <Card className="mb-3">
          {p.title ? (
            <CardHeader className="p-3">
              <CardTitle className="text-sm">{String(p.title)}</CardTitle>
            </CardHeader>
          ) : null}
          <CardContent className="p-3 pt-0">
            {renderChildren(evaluated.children, state, path)}
          </CardContent>
        </Card>,
      );

    case "button":
      return wrap(
        <Button size="sm" variant={p.variant as "default" | "outline" | "ghost" | undefined}>
          {String(p.label ?? p.text ?? "Button")}
        </Button>,
      );

    case "text":
      return wrap(<p className="text-muted-foreground text-sm">{String(p.content ?? "")}</p>);

    case "table": {
      const columns = (p.columns as string[]) ?? [];
      const rows = (p.rows as unknown[][]) ?? [];
      return wrap(
        <div className="border-muted overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                {columns.map((col: string, i: number) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: table columns from DSL
                  <th key={i} className="px-3 py-2 text-left font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: unknown[], ri: number) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: table rows from DSL
                <tr key={ri} className="hover:bg-muted/50 border-muted border-t">
                  {row.map((cell: unknown, ci: number) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: table cells from DSL
                    <td key={ci} className="px-3 py-1.5">
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }

    case "flex":
      return wrap(
        <div className="flex flex-wrap gap-2">
          {renderChildren(evaluated.children, state, path)}
        </div>,
      );

    case "grid":
      return wrap(
        <div className="grid grid-cols-2 gap-3">
          {renderChildren(evaluated.children, state, path)}
        </div>,
      );

    case "chart": {
      const chartType = String(p.type ?? "bar");
      const title = String(p.title ?? "Chart");
      // data 接受两种格式：
      // - 数组 [{label, value}, ...]
      // - 对象 { labels: [...], values: [...] }
      const rawData = p.data;
      let chartLabels: string[] = [];
      let chartValues: number[] = [];
      if (Array.isArray(rawData)) {
        for (const point of rawData) {
          if (
            point &&
            typeof point === "object" &&
            "value" in point &&
            typeof (point as { value: unknown }).value === "number"
          ) {
            chartValues.push((point as { value: number }).value);
            chartLabels.push(
              typeof (point as { label?: unknown }).label === "string"
                ? (point as { label: string }).label
                : String(chartValues.length - 1),
            );
          }
        }
      } else if (rawData && typeof rawData === "object") {
        const obj = rawData as { labels?: unknown; values?: unknown };
        if (Array.isArray(obj.labels)) chartLabels = obj.labels.map(String);
        if (Array.isArray(obj.values)) {
          chartValues = obj.values.map((v) => (Number.isFinite(v) ? Number(v) : 0));
        }
      }
      // 老格式兼容：p.labels / p.values
      if (chartLabels.length === 0 && Array.isArray(p.labels)) {
        chartLabels = (p.labels as string[]).map(String);
      }
      if (chartValues.length === 0 && Array.isArray(p.values)) {
        chartValues = (p.values as number[]).map((v) => (Number.isFinite(v) ? Number(v) : 0));
      }
      const dataValues = chartValues;
      const max = dataValues.length > 0 ? Math.max(...dataValues, 1) : 1;
      return wrap(
        <Card className="border-foreground/10 bg-card/40">
          <CardHeader className="p-3">
            <CardTitle className="text-foreground/95 text-[12.5px] font-medium">
              {title}
              <span className="text-muted-foreground/70 ml-1.5 font-mono text-[10px]">
                {chartType} · {dataValues.length} bars
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {dataValues.length === 0 ? (
              <p className="text-muted-foreground/70 py-6 text-center font-mono text-[10.5px]">
                no data
              </p>
            ) : chartType === "bar" || chartType === "column" ? (
              <div className="flex h-32 items-end gap-1">
                {dataValues.map((v, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: chart bars are static
                    key={i}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="bg-foreground/70 w-full rounded-sm transition-all"
                      style={{
                        height: `${Math.max(2, (v / max) * 100)}%`,
                        minHeight: "2px",
                      }}
                      title={`${chartLabels[i] ?? i}: ${v}`}
                    />
                    <span className="text-muted-foreground/70 w-full truncate text-center font-mono text-[9px]">
                      {chartLabels[i] ?? i}
                    </span>
                  </div>
                ))}
              </div>
            ) : chartType === "line" ? (
              <div className="relative h-32">
                <svg
                  viewBox={`0 0 ${dataValues.length * 10} 100`}
                  preserveAspectRatio="none"
                  className="h-full w-full"
                  aria-label={title}
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-foreground/80"
                    points={dataValues
                      .map((v, i) => `${i * 10 + 5},${100 - (v / max) * 95}`)
                      .join(" ")}
                  />
                  {dataValues.map((v, i) => (
                    <circle
                      // biome-ignore lint/suspicious/noArrayIndexKey: chart points
                      key={i}
                      cx={i * 10 + 5}
                      cy={100 - (v / max) * 95}
                      r={1.8}
                      className="text-foreground/80 fill-current"
                    />
                  ))}
                </svg>
              </div>
            ) : (
              <p className="text-muted-foreground/70 py-4 text-center font-mono text-[10.5px]">
                chart type "{chartType}" not supported
              </p>
            )}
          </CardContent>
        </Card>,
      );
    }

    case "input": {
      const inputType = String(p.type ?? "text");
      const inputId = `jsonui-input-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
      return wrap(
        <div className="mb-2">
          {p.label ? (
            <label htmlFor={inputId} className="text-muted-foreground mb-1 block text-xs">
              {String(p.label)}
            </label>
          ) : null}
          <input
            id={inputId}
            type={inputType}
            defaultValue={String(p.value ?? "")}
            placeholder={p.placeholder ? String(p.placeholder) : undefined}
            className="border-input bg-background w-full rounded border px-2 py-1 text-sm"
          />
        </div>,
      );
    }

    default:
      return wrap(
        <div className="text-muted-foreground/70 text-xs">
          [unknown node: {(node as { type: string }).type}]
        </div>,
      );
  }
}

export function JsonUiRenderer({
  node,
  state,
  onHover,
  onClick,
  highlightPath,
  outlineForPath,
}: {
  node: JsonUiNode;
  state?: unknown;
  /** 节点 hover 时回调（path） */
  onHover?: (path: string) => void;
  /** 节点 click 时回调（path） */
  onClick?: (path: string) => void;
  /** 高亮 path（与节点 path 一致时高亮） */
  highlightPath?: string | null;
  /** 按 path 查 outline 类名（用于 heatmap / 错误高亮） */
  outlineForPath?: (path: string) => string | undefined;
}): JSX.Element {
  const rootPath = "/root";
  return (
    <PathCtx.Provider
      value={{
        path: rootPath,
        onHover,
        onClick,
        highlightPath: highlightPath ?? null,
        outlineForPath,
      }}
    >
      <JsonUiRendererCore node={node} state={state ?? {}} path={rootPath} />
    </PathCtx.Provider>
  );
}
