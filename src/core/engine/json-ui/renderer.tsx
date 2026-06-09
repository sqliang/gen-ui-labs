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

    case "chart":
      return (
        <Card className="border-muted">
          <CardHeader className="p-3">
            <CardTitle className="text-xs">{String(p.title ?? "Chart")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="bg-muted flex items-center justify-center rounded p-4 text-[10px]">
              📊 {String(p.type ?? "bar")} chart placeholder
              {p.labels ? ` (${(p.labels as unknown[]).length} items)` : ""}
            </div>
          </CardContent>
        </Card>
      );

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
