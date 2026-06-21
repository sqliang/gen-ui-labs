import { describe, expect, it } from "vitest";

import {
  type A2uiComponentNode,
  type A2uiEvent,
  createA2uiStatefulAdapter,
} from "@/core/protocols/a2ui/mapper";

const card: A2uiComponentNode = {
  id: "c1",
  component: "card",
  children: ["t1", "b1"],
  props: { title: "Metrics" },
};
const text: A2uiComponentNode = {
  id: "t1",
  component: "text",
  props: { content: "42" },
};
const button: A2uiComponentNode = {
  id: "b1",
  component: "button",
  props: { label: "go" },
};

describe("a2ui stateful adapter", () => {
  describe("surfaceUpdate 增量", () => {
    it("首次 surfaceUpdate → 全部 mount", () => {
      const a = createA2uiStatefulAdapter();
      const out = a.adapt({
        type: "surfaceUpdate",
        surfaceId: "s1",
        contents: [card, text, button],
      });
      expect(out).toHaveLength(3);
      for (const e of out) {
        expect(e.kind).toBe("component");
        if (e.kind === "component") {
          expect(e.op).toBe("mount");
        }
      }
    });

    it("重复 surfaceUpdate 同一 id → patch（不是 mount）", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({
        type: "surfaceUpdate",
        surfaceId: "s1",
        contents: [card, text],
      });
      const out = a.adapt({
        type: "surfaceUpdate",
        surfaceId: "s1",
        contents: [card], // 已有
      });
      expect(out).toHaveLength(1);
      const e = out[0];
      expect(e?.kind).toBe("component");
      if (e?.kind === "component") {
        expect(e.op).toBe("patch");
        expect(e.id).toBe("c1");
      }
    });

    it("增量 surfaceUpdate（追加新组件）→ 只 mount 新的", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({
        type: "surfaceUpdate",
        surfaceId: "s1",
        contents: [card],
      });
      const out = a.adapt({
        type: "surfaceUpdate",
        surfaceId: "s1",
        contents: [text], // 新
      });
      expect(out).toHaveLength(1);
      const e = out[0];
      if (e?.kind === "component") {
        expect(e.op).toBe("mount");
        expect(e.id).toBe("t1");
      }
    });

    it("混合 mount + patch 一次 emit 多个 chunk", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({
        type: "surfaceUpdate",
        surfaceId: "s1",
        contents: [card],
      });
      const out = a.adapt({
        type: "surfaceUpdate",
        surfaceId: "s1",
        contents: [card, text], // card patch, text mount
      });
      expect(out).toHaveLength(2);
      const ops = out
        .filter((e): e is Extract<typeof e, { kind: "component" }> => e.kind === "component")
        .map((e) => `${e.op}:${e.id}`)
        .sort();
      expect(ops).toEqual(["mount:t1", "patch:c1"]);
    });
  });

  describe("dataModelUpdate 累积", () => {
    it("浅 merge 到 dataModel object", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({
        type: "dataModelUpdate",
        surfaceId: "s1",
        path: "/user",
        value: { name: "Alice" },
      });
      const out = a.adapt({
        type: "dataModelUpdate",
        surfaceId: "s1",
        path: "/user",
        value: { name: "Bob" },
      });
      expect(out).toHaveLength(1);
      const state = out[0];
      if (state?.kind === "state") {
        expect(state.value).toEqual({ user: { name: "Bob" } });
      }
    });

    it("嵌套 path 拆段", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({ type: "dataModelUpdate", surfaceId: "s1", path: "/user/name", value: "Alice" });
      a.adapt({ type: "dataModelUpdate", surfaceId: "s1", path: "/user/role", value: "admin" });
      const out = a.adapt({
        type: "dataModelUpdate",
        surfaceId: "s1",
        path: "/env",
        value: "prod",
      });
      expect(out).toHaveLength(1);
      const state = out[0];
      if (state?.kind === "state") {
        expect(state.value).toEqual({
          user: { name: "Alice", role: "admin" },
          env: "prod",
        });
      }
    });

    it("中间段是 primitive 时覆盖成 object", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({ type: "dataModelUpdate", surfaceId: "s1", path: "/x", value: 1 });
      const out = a.adapt({ type: "dataModelUpdate", surfaceId: "s1", path: "/x/y", value: 2 });
      const state = out[0];
      if (state?.kind === "state") {
        expect(state.value).toEqual({ x: { y: 2 } });
      }
    });
  });

  describe("beginRendering", () => {
    it("emit control.start + 完整 mount 树", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({ type: "surfaceUpdate", surfaceId: "s1", contents: [card, text] });
      const out = a.adapt({ type: "beginRendering", surfaceId: "s1", root: "c1" });
      expect(out).toHaveLength(2);
      expect(out[0]).toEqual({ kind: "control", type: "start" });
      const mount = out[1];
      if (mount?.kind === "component") {
        expect(mount.op).toBe("mount");
        expect(mount.id).toBe("s1");
        // node 是 components.values() array
        const nodes = mount.node as A2uiComponentNode[];
        expect(nodes).toHaveLength(2);
        expect(nodes.map((n) => n.id).sort()).toEqual(["c1", "t1"]);
      }
    });
  });

  describe("dismissSurface", () => {
    it("emit 每个组件 unmount + 清理", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({ type: "surfaceUpdate", surfaceId: "s1", contents: [card, text, button] });
      const out = a.adapt({ type: "dismissSurface", surfaceId: "s1" });
      expect(out).toHaveLength(3);
      for (const e of out) {
        if (e.kind === "component") {
          expect(e.op).toBe("unmount");
        }
      }
      // 再 dismiss 同一 surface → 不 emit
      const out2 = a.adapt({ type: "dismissSurface", surfaceId: "s1" });
      expect(out2).toEqual([]);
    });
  });

  describe("多 surface", () => {
    it("多个 surface 互不干扰", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({ type: "surfaceUpdate", surfaceId: "s1", contents: [card] });
      a.adapt({ type: "surfaceUpdate", surfaceId: "s2", contents: [text] });
      const snap = a.snapshot();
      expect(snap.size).toBe(2);
      expect(snap.get("s1")?.components.size).toBe(1);
      expect(snap.get("s2")?.components.size).toBe(1);
    });
  });

  describe("reset / snapshot", () => {
    it("reset 后清空所有 surface", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({ type: "surfaceUpdate", surfaceId: "s1", contents: [card] });
      a.reset();
      expect(a.snapshot().size).toBe(0);
    });

    it("snapshot 深拷贝不共享引用", () => {
      const a = createA2uiStatefulAdapter();
      a.adapt({ type: "surfaceUpdate", surfaceId: "s1", contents: [card] });
      const snap1 = a.snapshot();
      const snap2 = a.snapshot();
      // 不同的 Map 实例
      expect(snap1).not.toBe(snap2);
      const s1 = snap1.get("s1");
      const s2 = snap2.get("s1");
      expect(s1).not.toBe(s2);
      // 内部 components map 也不共享
      expect(s1?.components).not.toBe(s2?.components);
    });
  });

  describe("端到端 run", () => {
    it("完整 run：surfaceUpdate → dataModel × N → beginRendering", () => {
      const a = createA2uiStatefulAdapter();
      const events: A2uiEvent[] = [
        { type: "surfaceUpdate", surfaceId: "s1", contents: [card, text] },
        { type: "dataModelUpdate", surfaceId: "s1", path: "/user/name", value: "Alice" },
        { type: "dataModelUpdate", surfaceId: "s1", path: "/user/role", value: "admin" },
        { type: "beginRendering", surfaceId: "s1", root: "c1" },
      ];
      const all = events.flatMap((e) => a.adapt(e));
      // 2 mount (card + text) + 2 state (user/name + user/role) + (start + 1 mount 树) = 6
      expect(all).toHaveLength(6);
      expect(all[0]?.kind).toBe("component");
      expect(all[1]?.kind).toBe("component");
      expect(all[2]?.kind).toBe("state");
      expect(all[3]?.kind).toBe("state");
      expect(all[4]?.kind).toBe("control");

      // 验证最终 snapshot
      const snap = a.snapshot();
      const s1 = snap.get("s1");
      expect(s1?.root).toBe("c1");
      expect(s1?.components.size).toBe(2);
      expect(s1?.dataModel).toEqual({
        user: { name: "Alice", role: "admin" },
      });
    });
  });
});
