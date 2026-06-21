import { describe, expect, it } from "vitest";

import { type AguiEvent, createAguiStatefulAdapter } from "@/core/protocols/ag-ui/mapper";

describe("ag-ui stateful adapter", () => {
  it("text delta 直接 emit", () => {
    const a = createAguiStatefulAdapter();
    const out = a.adapt({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "hello",
    });
    expect(out).toEqual([{ kind: "text", delta: "hello" }]);
  });

  it("RUN_STARTED / RUN_FINISHED 透传", () => {
    const a = createAguiStatefulAdapter();
    expect(a.adapt({ type: "RUN_STARTED", threadId: "t", runId: "r" })).toEqual([
      { kind: "control", type: "start" },
    ]);
    expect(a.adapt({ type: "RUN_FINISHED", threadId: "t", runId: "r" })).toEqual([
      { kind: "control", type: "end" },
    ]);
  });

  describe("tool call 合并", () => {
    it("START + 多个 ARGS delta + END → 1 个 tool chunk with name + parsed args + id", () => {
      const a = createAguiStatefulAdapter();
      const toolId = "tc_42";

      const start = a.adapt({
        type: "TOOL_CALL_START",
        toolCallId: toolId,
        toolCallName: "search",
      });
      expect(start).toEqual([
        {
          kind: "control",
          type: "meta",
          meta: { toolStarted: toolId, name: "search" },
        },
      ]);

      const a1 = a.adapt({
        type: "TOOL_CALL_ARGS",
        toolCallId: toolId,
        delta: '{"q":',
      });
      expect(a1).toEqual([]);
      const a2 = a.adapt({
        type: "TOOL_CALL_ARGS",
        toolCallId: toolId,
        delta: '"hello"}',
      });
      expect(a2).toEqual([]);

      const end = a.adapt({ type: "TOOL_CALL_END", toolCallId: toolId });
      expect(end).toHaveLength(1);
      const tool = end[0];
      expect(tool?.kind).toBe("tool");
      if (tool?.kind === "tool") {
        expect(tool.name).toBe("search");
        expect(tool.args).toEqual({ q: "hello" });
        expect(tool.id).toBe(toolId);
      }
    });

    it("ARGS 不是合法 JSON 时塞 _raw buffer", () => {
      const a = createAguiStatefulAdapter();
      const toolId = "tc_bad";
      a.adapt({
        type: "TOOL_CALL_START",
        toolCallId: toolId,
        toolCallName: "x",
      });
      a.adapt({ type: "TOOL_CALL_ARGS", toolCallId: toolId, delta: "{" });
      const out = a.adapt({ type: "TOOL_CALL_END", toolCallId: toolId });
      expect(out).toHaveLength(1);
      const tool = out[0];
      if (tool?.kind === "tool") {
        expect(tool.args).toEqual({ _raw: "{" });
      }
    });

    it("并行多个 tool call 各自独立 buffer", () => {
      const a = createAguiStatefulAdapter();
      a.adapt({
        type: "TOOL_CALL_START",
        toolCallId: "a",
        toolCallName: "search",
      });
      a.adapt({ type: "TOOL_CALL_ARGS", toolCallId: "a", delta: '{"q":1}' });
      a.adapt({
        type: "TOOL_CALL_START",
        toolCallId: "b",
        toolCallName: "render",
      });
      a.adapt({
        type: "TOOL_CALL_ARGS",
        toolCallId: "b",
        delta: '{"x":2}',
      });

      const endA = a.adapt({ type: "TOOL_CALL_END", toolCallId: "a" });
      expect(endA).toHaveLength(1);
      const toolA = endA[0];
      if (toolA?.kind === "tool") {
        expect(toolA.name).toBe("search");
        expect(toolA.args).toEqual({ q: 1 });
        expect(toolA.id).toBe("a");
      }

      const endB = a.adapt({ type: "TOOL_CALL_END", toolCallId: "b" });
      expect(endB).toHaveLength(1);
      const toolB = endB[0];
      if (toolB?.kind === "tool") {
        expect(toolB.name).toBe("render");
        expect(toolB.args).toEqual({ x: 2 });
        expect(toolB.id).toBe("b");
      }
    });

    it("END 但没 START → 不 emit（不 crash）", () => {
      const a = createAguiStatefulAdapter();
      const out = a.adapt({ type: "TOOL_CALL_END", toolCallId: "ghost" });
      expect(out).toEqual([]);
    });
  });

  describe("state 累积", () => {
    it("SNAPSHOT 覆盖 buffer 并 emit 全量", () => {
      const a = createAguiStatefulAdapter();
      const out = a.adapt({
        type: "STATE_SNAPSHOT",
        snapshot: { x: 1, y: 2 },
      });
      expect(out).toHaveLength(1);
      const state = out[0];
      expect(state?.kind).toBe("state");
      if (state?.kind === "state") {
        expect(state.path).toBe("/");
        expect(state.value).toEqual({ x: 1, y: 2 });
      }
    });

    it("多个 DELTA 累积到 stateBuffer 数组", () => {
      const a = createAguiStatefulAdapter();
      a.adapt({
        type: "STATE_DELTA",
        delta: [{ op: "add", path: "/x", value: 1 }],
      });
      a.adapt({
        type: "STATE_DELTA",
        delta: [{ op: "add", path: "/y", value: 2 }],
      });
      const out = a.adapt({
        type: "STATE_DELTA",
        delta: [{ op: "add", path: "/z", value: 3 }],
      });
      expect(out).toHaveLength(1);
      const state = out[0];
      if (state?.kind === "state") {
        expect(state.path).toBe("/__delta__");
        expect(state.value).toEqual([
          { op: "add", path: "/x", value: 1 },
          { op: "add", path: "/y", value: 2 },
          { op: "add", path: "/z", value: 3 },
        ]);
      }
    });
  });

  describe("reset", () => {
    it("重置后状态清空", () => {
      const a = createAguiStatefulAdapter();
      a.adapt({
        type: "TOOL_CALL_START",
        toolCallId: "x",
        toolCallName: "old",
      });
      a.reset();
      const endOrphan = a.adapt({ type: "TOOL_CALL_END", toolCallId: "x" });
      expect(endOrphan).toEqual([]);
    });
  });

  describe("端到端 run", () => {
    it("完整 run：start → text → tool(call) → end", () => {
      const a = createAguiStatefulAdapter();
      const events: AguiEvent[] = [
        { type: "RUN_STARTED", threadId: "t", runId: "r" },
        { type: "TEXT_MESSAGE_CONTENT", messageId: "m1", delta: "我帮你搜索…" },
        {
          type: "TOOL_CALL_START",
          toolCallId: "tc1",
          toolCallName: "web_search",
        },
        {
          type: "TOOL_CALL_ARGS",
          toolCallId: "tc1",
          delta: '{"query":"genui labs"}',
        },
        { type: "TOOL_CALL_END", toolCallId: "tc1" },
        { type: "TEXT_MESSAGE_CONTENT", messageId: "m2", delta: "找到了" },
        { type: "RUN_FINISHED", threadId: "t", runId: "r" },
      ];

      const all = events.flatMap((e) => a.adapt(e));
      expect(all).toHaveLength(6);
      expect(all[0]).toEqual({ kind: "control", type: "start" });
      expect(all[1]).toEqual({ kind: "text", delta: "我帮你搜索…" });
      expect(all[2]).toEqual({
        kind: "control",
        type: "meta",
        meta: { toolStarted: "tc1", name: "web_search" },
      });
      const tool = all[3];
      expect(tool?.kind).toBe("tool");
      if (tool?.kind === "tool") {
        expect(tool.name).toBe("web_search");
        expect(tool.args).toEqual({ query: "genui labs" });
        expect(tool.id).toBe("tc1");
      }
      expect(all[4]).toEqual({ kind: "text", delta: "找到了" });
      expect(all[5]).toEqual({ kind: "control", type: "end" });
    });
  });
});
