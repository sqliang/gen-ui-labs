"use client";

import { useCallback, useRef } from "react";

import { LABS } from "@/core/labs";
import { pushSessionLog, type SessionLogEntry } from "@/core/state/sessions-log";

/**
 * 把"完成一次 lab 流式"记录进 sessionsLog。
 *
 * 用法：
 *   const logSession = useLogSession({
 *     lab: "streaming",
 *     protocol: "MD",
 *     getTitle: (text) => `Markdown · ${text.slice(0, 30)}…`,
 *     getTokens: () => charCount,
 *   });
 *   await runApi(...);
 *   logSession();  // 完成后调用，自动计算 duration + 写 localStorage
 */

interface UseLogSessionOpts {
  lab: SessionLogEntry["lab"];
  protocol: SessionLogEntry["protocol"];
  /** 从当前状态算出 session title */
  getTitle: () => string;
  /** 估算 token 数（mock 模式下用 char/4 估算；api 模式用 extract-metrics） */
  getTokens: () => number;
  /** 当前模型 id（写进 entry） */
  getModel?: () => string;
}

function genId(): string {
  // 4-hex 短 id，与 mock 风格保持一致
  return `ses_${Math.random().toString(16).slice(2, 6)}`;
}

function labAccent(labId: string): string {
  return LABS.find((l) => l.id === labId)?.accent.solid ?? "oklch(0.78 0.16 230)";
}

export function useLogSession(opts: UseLogSessionOpts) {
  const startRef = useRef<number | null>(null);

  // 每次"开始"前手动 reset（页面通常在 handleStart 里调）
  const markStart = useCallback(() => {
    startRef.current = Date.now();
  }, []);

  const logSession = useCallback(() => {
    if (startRef.current === null) return;
    const finishedAt = Date.now();
    const entry: SessionLogEntry = {
      id: genId(),
      title: opts.getTitle(),
      lab: opts.lab,
      protocol: opts.protocol,
      tokens: opts.getTokens(),
      durationMs: finishedAt - startRef.current,
      model: opts.getModel?.() ?? "deepseek-chat",
      finishedAt,
      accent: labAccent(opts.lab),
    };
    pushSessionLog(entry);
    // 跨页通知（首页 / about 会监听）
    window.dispatchEvent(new CustomEvent("sessionsLog:updated"));
    startRef.current = null;
  }, [opts]);

  return { markStart, logSession };
}
