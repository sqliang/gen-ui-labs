import { beforeEach, describe, expect, it } from "vitest";

import { useWorkbenchStore } from "@/core/state/workbench-store";

describe("workbench-store", () => {
  beforeEach(() => {
    useWorkbenchStore.getState().reset();
  });

  it("默认 layout 正确", () => {
    const s = useWorkbenchStore.getState();
    expect(s.layout.leftWidth).toBe(360);
    expect(s.layout.centerWidth).toBe(320);
    expect(s.selectedNode).toBe(null);
    expect(s.scrubberPosition).toBe(0);
    expect(s.paused).toBe(false);
  });

  it("setLayout 部分更新", () => {
    useWorkbenchStore.getState().setLayout({ leftWidth: 400 });
    const s = useWorkbenchStore.getState();
    expect(s.layout.leftWidth).toBe(400);
    expect(s.layout.centerWidth).toBe(320); // 未变
  });

  it("selectNode 修改选中节点", () => {
    useWorkbenchStore.getState().selectNode({ nodeId: "n1", sourceLine: 12 });
    expect(useWorkbenchStore.getState().selectedNode).toEqual({
      nodeId: "n1",
      sourceLine: 12,
    });

    useWorkbenchStore.getState().selectNode(null);
    expect(useWorkbenchStore.getState().selectedNode).toBe(null);
  });

  it("setScrubberPosition", () => {
    useWorkbenchStore.getState().setScrubberPosition(0.42);
    expect(useWorkbenchStore.getState().scrubberPosition).toBeCloseTo(0.42);
  });

  it("togglePause 翻转", () => {
    useWorkbenchStore.getState().togglePause();
    expect(useWorkbenchStore.getState().paused).toBe(true);
    useWorkbenchStore.getState().togglePause();
    expect(useWorkbenchStore.getState().paused).toBe(false);
  });
});
