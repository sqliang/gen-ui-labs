"use client";

/**
 * 站点级 sessions log（localStorage 持久化）。
 *
 * 用途：首页"最近会话"展示真数据。每次 Lab 完成一次流式就 push 一条。
 * 用 localStorage 是因为 session-store 是 client-only UI state，
 * 而 sessions log 是业务数据 —— 边界不该混。
 */

const STORAGE_KEY = "gen-ui-labs.sessions-log";

export interface SessionLogEntry {
  id: string;
  title: string;
  lab: "streaming" | "codegen" | "workbench" | "observability";
  protocol: "MD" | "AG-UI" | "A2UI" | "DSL" | "TSX" | "Inspector";
  tokens: number;
  durationMs: number;
  model: string;
  finishedAt: number;
  accent: string;
}

export function readSessionsLog(): SessionLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionLogEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function writeSessionsLog(entries: SessionLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

export function pushSessionLog(entry: SessionLogEntry, max = 50): SessionLogEntry[] {
  const cur = readSessionsLog();
  // 去重 by id（防同一次"开始"被 push 多次）
  const next = [entry, ...cur.filter((e) => e.id !== entry.id)].slice(0, max);
  writeSessionsLog(next);
  return next;
}

export function clearSessionsLog(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
