import { describe, expect, it } from "vitest";

import { createAguiStatefulAdapter } from "@/core/protocols/ag-ui/mapper";

/**
 * Compat / regression tests for ToolChunk.error handling
 * (added in v0.1.0-w5 when W5 ToolChunk.error? was introduced).
 */
describe("createAguiStatefulAdapter — error propagation", () => {
  it("emits tool chunk with error field when TOOL_CALL_END carries error", () => {
    const received: Array<{ name: string; error?: string; result?: unknown }> = [];
    const adapter = createAguiStatefulAdapter({
      onTool: (tool) => {
        received.push({
          name: tool.name,
          error: tool.error,
          result: tool.result,
        });
      },
    });
    adapter.adapt({ type: "TOOL_CALL_START", toolCallId: "tc1", toolCallName: "search" });
    adapter.adapt({ type: "TOOL_CALL_ARGS", toolCallId: "tc1", delta: '{"q":"x"}' });
    adapter.adapt({
      type: "TOOL_CALL_END",
      toolCallId: "tc1",
      error: "rate limit exceeded",
    });
    expect(received).toHaveLength(1);
    expect(received[0]?.name).toBe("search");
    expect(received[0]?.error).toBe("rate limit exceeded");
    expect(received[0]?.result).toBeUndefined();
  });

  it("emits tool chunk with result when TOOL_CALL_END carries result (no error)", () => {
    const received: Array<{ error?: string; result?: unknown }> = [];
    const adapter = createAguiStatefulAdapter({
      onTool: (tool) => received.push({ error: tool.error, result: tool.result }),
    });
    adapter.adapt({ type: "TOOL_CALL_START", toolCallId: "tc1", toolCallName: "search" });
    adapter.adapt({ type: "TOOL_CALL_ARGS", toolCallId: "tc1", delta: '{"q":"x"}' });
    adapter.adapt({
      type: "TOOL_CALL_END",
      toolCallId: "tc1",
      result: { hits: 42 },
    } as never);
    expect(received).toHaveLength(1);
    expect(received[0]?.error).toBeUndefined();
    expect(received[0]?.result).toEqual({ hits: 42 });
  });

  it("error mid-stream after partial args still emits single tool chunk", () => {
    const received: Array<{ args: unknown; error?: string }> = [];
    const adapter = createAguiStatefulAdapter({
      onTool: (tool) => received.push({ args: tool.args, error: tool.error }),
    });
    adapter.adapt({ type: "TOOL_CALL_START", toolCallId: "tc1", toolCallName: "run_sql" });
    adapter.adapt({ type: "TOOL_CALL_ARGS", toolCallId: "tc1", delta: '{"q":"SELECT 1"}' });
    adapter.adapt({
      type: "TOOL_CALL_END",
      toolCallId: "tc1",
      error: "syntax error at end of input",
    });
    expect(received).toHaveLength(1);
    expect(received[0]?.args).toEqual({ q: "SELECT 1" });
    expect(received[0]?.error).toBe("syntax error at end of input");
  });

  it("multiple tool calls each with their own error", () => {
    const received: Array<{ id?: string; error?: string }> = [];
    const adapter = createAguiStatefulAdapter({
      onTool: (tool) => received.push({ id: tool.id, error: tool.error }),
    });
    adapter.adapt({ type: "TOOL_CALL_START", toolCallId: "t1", toolCallName: "a" });
    adapter.adapt({ type: "TOOL_CALL_ARGS", toolCallId: "t1", delta: "{}" });
    adapter.adapt({ type: "TOOL_CALL_END", toolCallId: "t1", error: "e1" } as never);
    adapter.adapt({ type: "TOOL_CALL_START", toolCallId: "t2", toolCallName: "b" });
    adapter.adapt({ type: "TOOL_CALL_ARGS", toolCallId: "t2", delta: "{}" });
    adapter.adapt({ type: "TOOL_CALL_END", toolCallId: "t2", error: "e2" } as never);
    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ id: "t1", error: "e1" });
    expect(received[1]).toEqual({ id: "t2", error: "e2" });
  });
});
