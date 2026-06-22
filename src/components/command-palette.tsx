"use client";

import { ArrowRight, CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LABS } from "@/core/labs";
import { useUiStore } from "@/core/state/ui-store";
import { cn } from "@/lib/utils";

/**
 * 全局 ⌘K 命令面板（自实现，不引 cmdk 依赖）。
 *
 * 快捷键：Mac ⌘K · Win/Linux Ctrl+K
 *
 * 内容：
 * - 4 个 Lab 入口
 * - 14 个 Lab 子页（按 status 标识）
 * - 全站页面（首页 / about / settings / 404 demo）
 * - 外部链接（github / PROPOSAL.md）
 */
type Item = {
  id: string;
  label: string;
  hint?: string;
  meta?: string;
  status?: "done" | "wip" | "planned";
  onSelect: () => void;
};

export function CommandPalette() {
  const commandOpen = useUiStore((s) => s.commandOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const toggleCommand = useUiStore((s) => s.toggleCommand);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // sync
  useEffect(() => {
    setOpen(commandOpen);
    if (commandOpen) {
      setQuery("");
      setHighlight(0);
      // 等下个 tick focus
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [commandOpen]);

  // 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommand();
      } else if (e.key === "Escape" && commandOpen) {
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCommand, commandOpen, setCommandOpen]);

  const close = useCallback(() => {
    setOpen(false);
    setCommandOpen(false);
  }, [setCommandOpen]);

  // items
  const items: Item[] = useMemo(() => {
    const it: Item[] = [];
    for (const lab of LABS) {
      it.push({
        id: `lab-${lab.id}`,
        label: lab.title,
        hint: `Lab ${lab.number}`,
        meta: lab.href,
        onSelect: () => router.push(lab.href),
      });
    }
    for (const lab of LABS) {
      for (const s of lab.subPages) {
        it.push({
          id: `sub-${lab.id}-${s.number}`,
          label: s.title,
          hint: `${s.number} · ${lab.shortTitle}`,
          meta: s.href,
          status: s.status,
          onSelect: () => router.push(s.href),
        });
      }
    }
    it.push({
      id: "page-home",
      label: "首页",
      meta: "/",
      onSelect: () => router.push("/"),
    });
    it.push({
      id: "page-about",
      label: "关于 · manifesto + roadmap",
      meta: "/about",
      onSelect: () => router.push("/about"),
    });
    it.push({
      id: "page-settings",
      label: "设置 · Models",
      meta: "/settings/models",
      onSelect: () => router.push("/settings/models"),
    });
    it.push({
      id: "page-404",
      label: "404 demo · 自定义 not-found 页",
      meta: "/this-does-not-exist",
      onSelect: () => router.push("/this-does-not-exist"),
    });
    it.push({
      id: "ext-github",
      label: "GitHub repo",
      meta: "↗",
      onSelect: () => {
        window.open("https://github.com/sqliang/gen-ui-labs", "_blank", "noreferrer");
      },
    });
    it.push({
      id: "ext-proposal",
      label: "PROPOSAL.md · 完整方案",
      meta: "↗",
      onSelect: () => {
        window.open(
          "https://github.com/sqliang/gen-ui-labs/blob/main/PROPOSAL.md",
          "_blank",
          "noreferrer",
        );
      },
    });

    // 全局 actions —— 用 CustomEvent 派发到当前 Lab 页
    const action = (name: string, label: string, hint: string) => ({
      id: `action-${name}`,
      label,
      hint,
      meta: "⚡ action",
      onSelect: () => {
        window.dispatchEvent(new CustomEvent("genui:action", { detail: name }));
      },
    });
    it.push(action("toggle-theme", "切换主题 (light ↔ dark)", "全局"));
    it.push(action("open-command", "再次打开命令面板", "全局"));
    it.push(action("run-current", "启动当前 lab", "lab"));
    it.push(action("reset-current", "重置当前 lab", "lab"));
    it.push(action("clear-current", "清空当前 lab 输出", "lab"));

    // 全局 navigation —— 直接派发到路由
    it.push({
      id: "action-go-home",
      label: "回到首页",
      hint: "全局",
      meta: "⚡ nav",
      onSelect: () => router.push("/"),
    });
    it.push({
      id: "action-go-about",
      label: "打开 /about",
      hint: "全局",
      meta: "⚡ nav",
      onSelect: () => router.push("/about"),
    });
    it.push({
      id: "action-go-settings",
      label: "打开 /settings/models",
      hint: "全局",
      meta: "⚡ nav",
      onSelect: () => router.push("/settings/models"),
    });
    it.push({
      id: "action-scroll-top",
      label: "滚到页面顶部",
      hint: "全局",
      meta: "⚡ scroll",
      onSelect: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    });
    it.push({
      id: "action-scroll-bottom",
      label: "滚到页面底部",
      hint: "全局",
      meta: "⚡ scroll",
      onSelect: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
    });

    return it;
  }, [router]);

  // 过滤
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const hay = `${i.label} ${i.hint ?? ""} ${i.meta ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  // 键盘导航
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[highlight];
        if (item && item.status !== "planned") {
          item.onSelect();
          close();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, highlight, close]);

  // 当 query 变化时重置 highlight
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run only when query changes
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // 滚动到 highlight
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-hl="${highlight}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="close"
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* dialog */}
      <div className="bg-popover text-popover-foreground border-foreground/10 relative z-10 w-full max-w-lg overflow-hidden rounded-lg border shadow-2xl">
        {/* input */}
        <div className="border-foreground/10 flex items-center gap-2 border-b px-3">
          <Search className="text-muted-foreground/70 size-4" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 Lab、页面、动作…"
            className="placeholder:text-muted-foreground/50 h-11 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="border-foreground/15 text-muted-foreground/70 hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
            esc
          </kbd>
        </div>

        {/* list */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="text-muted-foreground/70 px-3 py-6 text-center font-mono text-[12px]">
              没找到结果
            </div>
          ) : (
            (() => {
              // 渲染分组：按 id 前缀分块
              const groups: Array<{
                key: string;
                label: string;
                items: Array<{ item: (typeof filtered)[0]; i: number }>;
              }> = [
                { key: "lab", label: "labs", items: [] },
                { key: "sub", label: "sub-pages", items: [] },
                { key: "page", label: "pages", items: [] },
                { key: "action", label: "actions", items: [] },
                { key: "ext", label: "external", items: [] },
              ];
              filtered.forEach((item, i) => {
                const k = item.id.split("-")[0] ?? "";
                const g = groups.find((g) => g.key === k) ?? groups[0];
                if (g) g.items.push({ item, i });
              });
              return groups
                .filter((g) => g.items.length > 0)
                .map((g) => (
                  <div key={g.key} className="mb-1 last:mb-0">
                    <div className="text-muted-foreground/50 px-2 py-1 font-mono text-[9.5px] tracking-widest uppercase">
                      {g.label}
                    </div>
                    {g.items.map(({ item, i }) => {
                      const isHl = i === highlight;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-hl={i}
                          onClick={() => {
                            if (item.status === "planned") return;
                            item.onSelect();
                            close();
                          }}
                          onMouseEnter={() => setHighlight(i)}
                          disabled={item.status === "planned"}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
                            item.status === "planned"
                              ? "text-muted-foreground/40 cursor-not-allowed"
                              : isHl
                                ? "bg-foreground/[0.08] text-foreground"
                                : "text-foreground/85 hover:bg-foreground/[0.04]",
                          )}
                        >
                          {item.hint ? (
                            <span className="text-muted-foreground/70 min-w-[5rem] font-mono text-[10.5px]">
                              {item.hint}
                            </span>
                          ) : null}
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.status ? (
                            <span
                              className={cn(
                                "font-mono text-[10px] tracking-wider uppercase",
                                item.status === "done"
                                  ? "text-emerald-400/85"
                                  : item.status === "wip"
                                    ? "text-amber-400/85"
                                    : "text-muted-foreground/50",
                              )}
                            >
                              {item.status === "done"
                                ? "✓ done"
                                : item.status === "wip"
                                  ? "◐ wip"
                                  : "○ planned"}
                            </span>
                          ) : null}
                          <span className="text-muted-foreground/50 hidden font-mono text-[10px] sm:inline">
                            {item.meta}
                          </span>
                          {isHl && item.status !== "planned" ? (
                            <CornerDownLeft className="text-muted-foreground/70 size-3" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ));
            })()
          )}
        </div>

        {/* footer */}
        <div className="border-foreground/10 text-muted-foreground/60 flex items-center justify-between border-t px-3 py-1.5 font-mono text-[10px]">
          <span className="flex items-center gap-2">
            <kbd className="border-foreground/15 rounded border px-1 py-px">↑</kbd>
            <kbd className="border-foreground/15 rounded border px-1 py-px">↓</kbd>
            navigate
            <kbd className="border-foreground/15 ml-2 rounded border px-1 py-px">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <ArrowRight className="size-3" />
            {filtered.length} results
          </span>
        </div>
      </div>
    </div>
  );
}
