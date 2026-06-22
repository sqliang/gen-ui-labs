import { describe, expect, it } from "vitest";

import { applyJsonUiPatch } from "@/core/engine/json-ui/apply";
import type { JsonUiDocument } from "@/core/engine/json-ui/types";

describe("applyJsonUiPatch field segments", () => {
  it("patch /root/children/0/props merges new props into existing", () => {
    const doc: JsonUiDocument = {
      root: {
        type: "card",
        children: [{ type: "chart", props: { type: "bar", title: "old" } }],
      },
    };
    const next = applyJsonUiPatch(doc, {
      op: "patch",
      path: "/root/children/0/props",
      value: {
        type: "bar",
        data: [
          { label: "a", value: 1 },
          { label: "b", value: 2 },
        ],
      },
    });
    const chart = next.root.children?.[0];
    expect(chart?.props?.title).toBe("old");
    expect(chart?.props?.type).toBe("bar");
    expect(chart?.props?.data).toEqual([
      { label: "a", value: 1 },
      { label: "b", value: 2 },
    ]);
  });

  it("patch /root/children/0/type changes type", () => {
    const doc: JsonUiDocument = {
      root: { type: "card", children: [{ type: "chart", props: {} }] },
    };
    const next = applyJsonUiPatch(doc, {
      op: "patch",
      path: "/root/children/0/type",
      value: { type: "table" },
    });
    expect(next.root.children?.[0]?.type).toBe("table");
  });

  it("path with unknown trailing segment returns doc unchanged", () => {
    const doc: JsonUiDocument = {
      root: { type: "card", children: [{ type: "chart", props: {} }] },
    };
    const next = applyJsonUiPatch(doc, {
      op: "patch",
      path: "/root/children/0/unknown",
      value: { x: 1 },
    });
    expect(next).toBe(doc);
  });

  it("preserves immutability: original doc is not mutated", () => {
    const doc: JsonUiDocument = {
      root: {
        type: "card",
        children: [{ type: "chart", props: { title: "before" } }],
      },
    };
    const snapshot = JSON.parse(JSON.stringify(doc)) as JsonUiDocument;
    applyJsonUiPatch(doc, {
      op: "patch",
      path: "/root/children/0/props",
      value: { title: "after", accent: "red" },
    });
    expect(doc).toEqual(snapshot);
  });
});
