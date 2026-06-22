"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { LABS } from "@/core/labs";
import {
  clearSessionsLog,
  readSessionsLog,
  type SessionLogEntry,
  subscribeSessionsLog,
} from "@/core/state/sessions-log";

/**
 * 首页"最近会话"——真数据。
 *
 * - mount 时读 sessionsLog localStorage
 * - 监听 sessionsLog:updated 事件（其他 page 完成流式会发）
 * - 提供"清空"按钮
 */

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s 前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m 前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h 前`;
  const day = Math.floor(hr / 24);
  return `${day}d 前`;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const MOCK_SEED: SessionLogEntry[] = [
  {
    id: "ses_demo_a8f3",
    title: "Streaming Markdown demo",
    lab: "streaming",
    protocol: "MD",
    tokens: 842,
    durationMs: 1700,
    model: "deepseek-chat",
    finishedAt: Date.now() - 1000 * 60 * 12,
    accent: LABS[0]?.accent.solid ?? "oklch(0.78 0.16 230)",
  },
  {
    id: "ses_demo_c2d1",
    title: "AG-UI v0.2 protocol probe",
    lab: "streaming",
    protocol: "AG-UI",
    tokens: 1620,
    durationMs: 3200,
    model: "deepseek-chat",
    finishedAt: Date.now() - 1000 * 60 * 60 * 1.5,
    accent: LABS[0]?.accent.solid ?? "oklch(0.78 0.16 230)",
  },
  {
    id: "ses_demo_91b7",
    title: "JSON-UI DSL · dashboard",
    lab: "codegen",
    protocol: "DSL",
    tokens: 2340,
    durationMs: 4500,
    model: "deepseek-chat",
    finishedAt: Date.now() - 1000 * 60 * 60 * 30,
    accent: LABS[1]?.accent.solid ?? "oklch(0.74 0.18 290)",
  },
  {
    id: "ses_demo_e4b6",
    title: "Workbench · 3-pane layout",
    lab: "workbench",
    protocol: "Inspector",
    tokens: 0,
    durationMs: 0,
    model: "—",
    finishedAt: Date.now() - 1000 * 60 * 60 * 36,
    accent: LABS[2]?.accent.solid ?? "oklch(0.78 0.16 75)",
  },
];

export function RecentSessions() {
  const [entries, setEntries] = useState<SessionLogEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 第一次读 localStorage
    let stored = readSessionsLog();
    // 第一次访问，注入 mock seed（避免空态）
    if (stored.length === 0) {
      stored = MOCK_SEED;
    }
    setEntries(stored);
    setMounted(true);

    // 监听跨页 sessions 更新
    const unsubscribe = subscribeSessionsLog(() => setEntries(readSessionsLog()));
    return unsubscribe;
  }, []);

  const handleClear = () => {
    clearSessionsLog();
    setEntries([]);
  };

  // 取最近 6 条
  const recent = entries.slice(0, 6);

  return (
    <div className="border-border/30 bg-card/30 overflow-hidden rounded-xl border backdrop-blur-sm">
      <div className="border-border/20 text-muted-foreground/60 grid grid-cols-[1.5fr_0.6fr_0.5fr_0.5fr_auto] gap-4 border-b px-5 py-2.5 font-mono text-[10px] tracking-widest uppercase">
        <span>session</span>
        <span>protocol</span>
        <span className="text-right">tokens</span>
        <span className="text-right">duration</span>
        <span className="flex items-center gap-2">
          when
          {mounted && entries.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground/50 hover:text-foreground font-mono text-[9.5px] normal-case tracking-normal"
            >
              clear
            </button>
          ) : null}
        </span>
      </div>
      <ul className="divide-border/20 divide-y">
        {recent.length === 0 ? (
          <li className="px-5 py-6 text-center font-mono text-[11px] text-muted-foreground/60">
            还没有 session — 进任意 Lab 点「开始」试试
          </li>
        ) : (
          recent.map((s) => (
            <li
              key={s.id}
              className="hover:bg-foreground/[0.03] grid grid-cols-[1.5fr_0.6fr_0.5fr_0.5fr_auto] items-center gap-4 px-5 py-3.5 transition-colors"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.accent }}
                />
                <div className="min-w-0">
                  <div className="text-foreground/95 truncate text-[13px] font-medium">
                    {s.title}
                  </div>
                  <div className="text-muted-foreground/60 mt-0.5 font-mono text-[10px]">
                    {s.id.slice(0, 12)} · ~/{s.lab}
                  </div>
                </div>
              </div>
              <span
                className="rounded px-1.5 py-0.5 font-mono text-[10px] w-fit"
                style={{
                  backgroundColor: `${s.accent}1a`,
                  color: s.accent,
                }}
              >
                {s.protocol}
              </span>
              <span className="text-muted-foreground/85 text-right font-mono text-[12px] tabular-nums">
                {s.tokens > 0 ? formatTokens(s.tokens) : "—"}
              </span>
              <span className="text-muted-foreground/70 text-right font-mono text-[12px] tabular-nums">
                {s.durationMs > 0 ? `${(s.durationMs / 1000).toFixed(1)}s` : "—"}
              </span>
              <span className="text-muted-foreground/65 font-mono text-[11px]">
                {relativeTime(s.finishedAt)}
              </span>
            </li>
          ))
        )}
      </ul>
      <div className="text-muted-foreground/55 mt-3 px-5 pb-3 font-mono text-[10px]">
        {`// localStorage 持久化 · W9 升级到 IndexedDB + 真模型 token 计数`}
      </div>
    </div>
  );
}

export function RecentSessionsSection() {
  return (
    <section className="mx-auto max-w-[1280px] px-6 pb-24">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-muted-foreground/60 font-mono text-[11px] tracking-widest uppercase">
            recent sessions
          </div>
          <h2 className="text-foreground/95 mt-1 text-2xl font-semibold tracking-tight">
            最近会话
          </h2>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground/80 hover:text-foreground font-mono text-[11px]"
        >
          <Link href="/labs/streaming">view all →</Link>
        </Button>
      </div>
      <RecentSessions />
    </section>
  );
}
