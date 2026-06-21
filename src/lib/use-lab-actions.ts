"use client";

import { useEffect } from "react";

/**
 * 把 ⌘K 命令面板的 actions 接到当前 lab 页。
 *
 * ⌘K 触发 action 时派发 `genui:action` CustomEvent（detail = name）。
 * 本 hook 在 mount 时监听事件，按 name 调用对应回调。
 *
 * name 来自 src/components/command-palette.tsx 的 action items：
 *   - "run-current"   → onStart
 *   - "reset-current" → onReset
 *   - "clear-current" → onReset（同 reset，UI 上不一样）
 *   - "stop-current"  → onStop
 */
export function useLabActions(opts: {
  onStart?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  enabled?: boolean;
}): void {
  const { onStart, onStop, onReset, enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "run-current") onStart?.();
      else if (detail === "reset-current" || detail === "clear-current") onReset?.();
      else if (detail === "stop-current") onStop?.();
    };
    window.addEventListener("genui:action", handler);
    return () => window.removeEventListener("genui:action", handler);
  }, [enabled, onStart, onStop, onReset]);
}
