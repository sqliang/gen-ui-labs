"use client";

import { useEffect } from "react";

import { type ThemeMode, useUiStore } from "@/core/state/ui-store";

/**
 * 主题应用器：把 uiStore.themeMode 同步到 <html> 上的 .dark class。
 *
 * 设计：
 * - 第一次 mount 时根据 themeMode 决定：dark/light 都显式设；system 读 media query
 * - 后续 themeMode 变化时也重新应用
 * - 同时同步 <html style="color-scheme"> 浏览器原生 form/widget 颜色
 *
 * 为什么这样改：
 * - 之前 layout.tsx 在 <body> 上写死了 `class="dark"`，导致 ThemeSwitcher
 *   改 <html> class 不生效（body 自己始终是 dark）
 * - 之前 ThemeSwitcher 改 localStorage 但不调 useUiStore，ThemeApplier
 *   不会重跑（themeMode 没变），所以点了等于没点
 * - 现在：ThemeSwitcher 调 setTheme → useUiStore 更新 → ThemeApplier 重跑
 *   → <html>.dark 同步
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
      // 同步浏览器原生 color scheme（滚动条、form widget）
      root.style.colorScheme = isDark ? "dark" : "light";
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
