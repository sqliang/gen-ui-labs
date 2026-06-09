import { beforeEach, describe, expect, it } from "vitest";

import { useUiStore } from "@/core/state/ui-store";

describe("ui-store", () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it("默认状态正确", () => {
    const state = useUiStore.getState();
    expect(state.themeMode).toBe("system");
    expect(state.commandOpen).toBe(false);
    expect(state.sidebarWidth).toBe(280);
  });

  it("setTheme 修改主题", () => {
    useUiStore.getState().setTheme("dark");
    expect(useUiStore.getState().themeMode).toBe("dark");
  });

  it("toggleCommand 翻转命令面板开合", () => {
    useUiStore.getState().toggleCommand();
    expect(useUiStore.getState().commandOpen).toBe(true);
    useUiStore.getState().toggleCommand();
    expect(useUiStore.getState().commandOpen).toBe(false);
  });

  it("setSidebarWidth 修改侧栏宽度", () => {
    useUiStore.getState().setSidebarWidth(320);
    expect(useUiStore.getState().sidebarWidth).toBe(320);
  });
});
