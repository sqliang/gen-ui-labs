"use client";

import { useEffect } from "react";

import { type ThemeMode, useUiStore } from "@/core/state/ui-store";

/**
 * 主题应用器：监听 uiStore.themeMode，给 <html> 加/去 .dark class。
 * 单独抽出来是为了让 RootLayout 保持 Server Component。
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

    // system 模式监听系统变化
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
