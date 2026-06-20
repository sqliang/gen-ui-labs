"use client";

import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JsonUiNode } from "./types";

/**
 * JSON-UI → React 递归渲染器。W6 范围：card / button / text / table / flex / grid / chart / input。
 */
function renderChildren(children?: JsonUiNode[]): JSX.Element | null {
  if (!children || children.length === 0) return null;
  return (
    <>
      {children.map((child, i) => (
        <JsonUiRenderer key={child.id ?? `child-${i}`} node={child} />
      ))}
    </>
  );
}

export function JsonUiRenderer({ node }: { node: JsonUiNode }): JSX.Element {
  const p = node.props ?? {};

  switch (node.type) {
    case "card":
      return (
        <Card className="mb-3">
          {p.title ? (
            <CardHeader className="p-3">
              <CardTitle className="text-sm">{String(p.title)}</CardTitle>
            </CardHeader>
          ) : null}
          <CardContent className="p-3 pt-0">{renderChildren(node.children)}</CardContent>
        </Card>
      );

    case "button":
      return (
        <Button size="sm" variant={p.variant as "default" | "outline" | "ghost" | undefined}>
          {String(p.label ?? p.text ?? "Button")}
        </Button>
      );

    case "text":
      return <p className="text-muted-foreground text-sm">{String(p.content ?? "")}</p>;

    case "table": {
      const columns = (p.columns as string[]) ?? [];
      const rows = (p.rows as unknown[][]) ?? [];
      return (
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
        </div>
      );
    }

    case "flex":
      return <div className="flex flex-wrap gap-2">{renderChildren(node.children)}</div>;

    case "grid":
      return <div className="grid grid-cols-2 gap-3">{renderChildren(node.children)}</div>;

    case "chart": {
      const chartType = String(p.type ?? "bar");
      const title = String(p.title ?? "Chart");
      const labels = (p.labels as string[] | undefined) ?? [];
      const values = ((p.values as number[] | undefined) ?? []).map((v) =>
        Number.isFinite(v) ? Number(v) : 0,
      );
      // p.data 是 alternate shape: { values: number[]; labels?: string[] }
      const dataValues =
        values.length > 0
          ? values
          : ((p.data as { values?: number[] } | undefined)?.values ?? []).map((v) =>
              Number.isFinite(v) ? Number(v) : 0,
            );
      const max = dataValues.length > 0 ? Math.max(...dataValues, 1) : 1;

      return (
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
                      title={`${labels[i] ?? i}: ${v}`}
                    />
                    <span className="text-muted-foreground/70 w-full truncate text-center font-mono text-[9px]">
                      {labels[i] ?? i}
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
                      r="1.5"
                      className="fill-foreground/80"
                    />
                  ))}
                </svg>
              </div>
            ) : (
              <p className="text-muted-foreground/70 py-6 text-center font-mono text-[10.5px]">
                {chartType} not supported yet
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    case "input":
      return (
        <input
          type="text"
          placeholder={String(p.placeholder ?? "")}
          className="border-input bg-background w-full rounded-md border px-3 py-1.5 text-sm"
          readOnly
        />
      );

    default:
      return <div className="text-muted-foreground text-xs">Unknown: {node.type}</div>;
  }
}
