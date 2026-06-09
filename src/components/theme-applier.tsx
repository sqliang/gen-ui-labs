"use client";

import { useEffect } from "react";

import { type ThemeMode, useUiStore } from "@/core/state/ui-store";

/**
 * 主题应用器：监听 uiStore.themeMode 的后续变化。
 *
 * 注意：FOUC（首屏闪烁）防护由 RootLayout 里 inline 的 init script 负责，
 * 本组件只接管 hydration 之后的状态变化。
 */
export function ThemeApplier() {
  const themeMode = useUiStore((s) => s.themeMode);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: ThemeMode) => {
      const isDark =
        mode === "dark" ||
        (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", isDark);
    };
    apply(themeMode);

    if (themeMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    return undefined;
  }, [themeMode]);

  return null;
}
