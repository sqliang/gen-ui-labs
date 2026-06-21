import { describe, expect, it } from "vitest";

import { applyJsonUiPatch } from "@/core/engine/json-ui/apply";
import type { JsonUiDocument, JsonUiNode, JsonUiPatch } from "@/core/engine/json-ui/types";

const textNode = (content: string): JsonUiNode => ({
  type: "text",
  props: { content },
});
const cardNode = (title: string, children: JsonUiNode[] = []): JsonUiNode => ({
  type: "card",
  props: { title },
  children,
});

describe("core/engine/json-ui/apply", () => {
  describe("mount", () => {
    it("mount 到 /root 替换整棵树", () => {
      const doc: JsonUiDocument = { root: textNode("old") };
      const out = applyJsonUiPatch(doc, {
        op: "mount",
        path: "/root",
        value: cardNode("new"),
      });
      expect(out.root).toEqual(cardNode("new"));
    });

    it("mount 到 /root/children/0 在第一个 child 位置插入", () => {
      const doc: JsonUiDocument = {
        root: cardNode("root", [textNode("a"), textNode("b")]),
      };
      const out = applyJsonUiPatch(doc, {
        op: "mount",
        path: "/root/children/0",
        value: textNode("new"),
      });
      expect(out.root.children).toHaveLength(3);
      expect(out.root.children?.[0]).toEqual(textNode("new"));
      // 不可变：原 doc 没变
      expect(doc.root.children).toHaveLength(2);
    });

    it("mount 时 path 中间节点不存在 → cascading 创建 text 占位", () => {
      const doc: JsonUiDocument = { root: cardNode("root") };
      const out = applyJsonUiPatch(doc, {
        op: "mount",
        path: "/root/children/2/children/0",
        value: textNode("deep"),
      });
      expect(out.root.children).toHaveLength(3);
      const child2 = out.root.children?.[2];
      expect(child2?.type).toBe("text"); // 占位
      const grandchild = (child2 as JsonUiNode)?.children?.[0];
      expect(grandchild).toEqual(textNode("deep"));
    });

    it("mount 时 out-of-range idx 自动补 text 占位", () => {
      const doc: JsonUiDocument = { root: cardNode("root") };
      const out = applyJsonUiPatch(doc, {
        op: "mount",
        path: "/root/children/3",
        value: textNode("auto"),
      });
      expect(out.root.children).toHaveLength(4);
      expect(out.root.children?.[3]).toEqual(textNode("auto"));
    });

    it("mount 没有 value → no-op", () => {
      const doc: JsonUiDocument = { root: textNode("a") };
      const out = applyJsonUiPatch(doc, {
        op: "mount",
        path: "/root/children/0",
      });
      expect(out).toBe(doc);
    });

    it("path 不以 /root 开头 → no-op", () => {
      const doc: JsonUiDocument = { root: textNode("a") };
      const out = applyJsonUiPatch(doc, {
        op: "mount",
        path: "/other/children/0",
        value: textNode("x"),
      });
      expect(out).toBe(doc);
    });
  });

  describe("patch", () => {
    it("patch 改 root 节点 props", () => {
      const doc: JsonUiDocument = {
        root: cardNode("old title"),
      };
      const out = applyJsonUiPatch(doc, {
        op: "patch",
        path: "/root",
        value: { props: { title: "new title" } },
      });
      expect(out.root.props?.title).toBe("new title");
    });

    it("patch 改 child 的 props", () => {
      const doc: JsonUiDocument = {
        root: cardNode("root", [textNode("a")]),
      };
      const out = applyJsonUiPatch(doc, {
        op: "patch",
        path: "/root/children/0",
        value: { props: { content: "b" } },
      });
      expect(out.root.children?.[0]?.props?.content).toBe("b");
    });

    it("patch 不存在的 path → no-op", () => {
      const doc: JsonUiDocument = { root: cardNode("root") };
      const out = applyJsonUiPatch(doc, {
        op: "patch",
        path: "/root/children/5",
        value: { props: {} },
      });
      expect(out).toBe(doc);
    });

    it("patch 不以 /root 开头 → no-op", () => {
      const doc: JsonUiDocument = { root: textNode("a") };
      const out = applyJsonUiPatch(doc, {
        op: "patch",
        path: "/other",
        value: { props: {} },
      });
      expect(out).toBe(doc);
    });

    it("patch 部分字段：保留其他 props", () => {
      const doc: JsonUiDocument = {
        root: { type: "card", props: { title: "a", accent: "blue" } },
      };
      const out = applyJsonUiPatch(doc, {
        op: "patch",
        path: "/root",
        value: { props: { title: "b" } },
      });
      expect(out.root.props).toEqual({ title: "b", accent: "blue" });
    });
  });

  describe("unmount", () => {
    it("unmount 一个 child", () => {
      const doc: JsonUiDocument = {
        root: cardNode("root", [textNode("a"), textNode("b"), textNode("c")]),
      };
      const out = applyJsonUiPatch(doc, {
        op: "unmount",
        path: "/root/children/1",
      });
      expect(out.root.children).toHaveLength(2);
      expect(out.root.children?.[0]).toEqual(textNode("a"));
      expect(out.root.children?.[1]).toEqual(textNode("c"));
    });

    it("unmount 不存在的 path → no-op", () => {
      const doc: JsonUiDocument = { root: cardNode("root", []) };
      const out = applyJsonUiPatch(doc, {
        op: "unmount",
        path: "/root/children/5",
      });
      expect(out).toBe(doc);
    });

    it("unmount root → no-op（root 不可 unmount）", () => {
      const doc: JsonUiDocument = { root: textNode("a") };
      const out = applyJsonUiPatch(doc, {
        op: "unmount",
        path: "/root",
      });
      expect(out).toBe(doc);
    });
  });

  describe("不可变性", () => {
    it("mount 后原 doc 不变", () => {
      const doc: JsonUiDocument = { root: cardNode("root", [textNode("a")]) };
      const out = applyJsonUiPatch(doc, {
        op: "mount",
        path: "/root/children/0",
        value: textNode("x"),
      });
      expect(doc.root.children).toHaveLength(1);
      expect(out).not.toBe(doc);
      expect(out.root).not.toBe(doc.root);
    });

    it("unmount 后原 doc 不变", () => {
      const doc: JsonUiDocument = { root: cardNode("root", [textNode("a")]) };
      const out = applyJsonUiPatch(doc, {
        op: "unmount",
        path: "/root/children/0",
      });
      expect(doc.root.children).toHaveLength(1);
      expect(out).not.toBe(doc);
    });
  });

  describe("end-to-end patch 序列", () => {
    it("build 一个 UI 树：mount 6 个 patch → 最终 doc 是完整卡片", () => {
      let doc: JsonUiDocument = { root: textNode("empty") };
      const patches: JsonUiPatch[] = [
        { op: "mount", path: "/root", value: cardNode("Dashboard") },
        { op: "mount", path: "/root/children/0", value: textNode("title text") },
        {
          op: "patch",
          path: "/root/children/0",
          value: { props: { content: "Updated title" } },
        },
        {
          op: "mount",
          path: "/root/children/1",
          value: { type: "button", props: { label: "click" } },
        },
        {
          op: "patch",
          path: "/root",
          value: { props: { title: "Final Title" } },
        },
        { op: "unmount", path: "/root/children/0" },
      ];
      for (const p of patches) {
        doc = applyJsonUiPatch(doc, p);
      }
      expect(doc.root.type).toBe("card");
      expect(doc.root.props?.title).toBe("Final Title");
      expect(doc.root.children).toHaveLength(1);
      expect(doc.root.children?.[0]?.type).toBe("button");
    });
  });
});
