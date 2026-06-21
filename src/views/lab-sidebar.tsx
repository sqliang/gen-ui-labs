"use client";

import { Bot, Code2, Eye, Radio } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { LABS } from "@/core/labs";
import { useSessionStore } from "@/core/state/session-store";
import { cn } from "@/lib/utils";

/**
 * 把 URL ?model=xxx / ?session=xxx / ?lab=xxx 同步进 session-store。
 * 只在 client mount 后读取（避免 SSR 期 useSearchParams 报错）。
 */
function useUrlToStore(): void {
  const setModel = useSessionStore((s) => s.setCurrentModel);
  const setSession = useSessionStore((s) => s.setCurrentSession);
  const setLab = useSessionStore((s) => s.setCurrentLab);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const model = params.get("model");
    const session = params.get("session");
    const lab = params.get("lab");
    if (model) setModel(model);
    if (session) setSession(session);
    if (lab) setLab(lab);
  }, [setModel, setSession, setLab]);
}

export function LabSidebar() {
  const pathname = usePathname();
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const [mounted, setMounted] = useState(false);
  // 默认展开当前 lab
  const initialLabId = (() => {
    if (typeof pathname === "string") {
      const match = pathname.match(/^\/labs\/([^/]+)/);
      if (match) return match[1];
    }
    return null;
  })();
  const [expandedLabId, setExpandedLabId] = useState<string | null>(initialLabId ?? null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // URL 切换时自动展开对应 lab
  useEffect(() => {
    if (typeof pathname !== "string") return;
    const match = pathname.match(/^\/labs\/([^/]+)/);
    if (match?.[1]) setExpandedLabId(match[1]);
  }, [pathname]);

  // URL → session-store 单向同步（只在 mount 后）
  useUrlToStore();

  return (
    <aside className="bg-card text-card-foreground border-border flex w-56 shrink-0 flex-col border-r">
      <div className="border-border border-b px-4 py-4">
        <Link
          href="/"
          className="text-foreground text-sm font-semibold tracking-tight hover:underline"
        >
          ← 返回首页
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <ul className="space-y-0.5">
          {LABS.map((lab) => {
            const Icon =
              lab.id === "streaming"
                ? Radio
                : lab.id === "codegen"
                  ? Code2
                  : lab.id === "workbench"
                    ? Eye
                    : Bot;
            const href = `/labs/${lab.id}`;
            const isLabActive = pathname.startsWith(href);
            const isExpanded = expandedLabId === lab.id;
            const subPages = lab.subPages;
            return (
              <li key={lab.id}>
                <button
                  type="button"
                  onClick={() => setExpandedLabId((cur) => (cur === lab.id ? null : lab.id))}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    isLabActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 text-left">Lab · {lab.id}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "text-muted-foreground/60 transition-transform",
                      isExpanded && "rotate-90",
                    )}
                  >
                    ▸
                  </span>
                </button>
                {/* 子页列表（折叠/展开） */}
                {isExpanded && subPages.length > 0 ? (
                  <ul
                    className={cn(
                      "mt-0.5 ml-4 space-y-0.5 border-l border-foreground/10 pl-2",
                      "animate-in slide-in-from-top-1 fade-in-0 duration-200",
                    )}
                  >
                    {subPages.map((sp) => {
                      const isActive = pathname === sp.href;
                      const isPlanned = sp.status === "planned";
                      return (
                        <li key={sp.href}>
                          {isPlanned ? (
                            <span
                              className="text-muted-foreground/45 flex items-center gap-2 rounded-md px-2.5 py-1 font-mono text-[11px] cursor-not-allowed"
                              title="WIP · roadmap"
                            >
                              <span className="text-muted-foreground/50">○</span>
                              <span className="truncate">
                                {sp.number} · {sp.title}
                              </span>
                            </span>
                          ) : (
                            <Link
                              href={sp.href}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors",
                                isActive
                                  ? "bg-foreground/[0.08] text-foreground font-medium"
                                  : "text-muted-foreground/85 hover:text-foreground hover:bg-foreground/[0.04]",
                              )}
                              title={sp.description}
                            >
                              <span
                                className={cn(
                                  "shrink-0",
                                  sp.status === "done"
                                    ? "text-emerald-400/80"
                                    : sp.status === "wip"
                                      ? "text-amber-400/80"
                                      : "text-muted-foreground/50",
                                )}
                              >
                                {sp.status === "done" ? "✓" : sp.status === "wip" ? "◐" : "○"}
                              </span>
                              <span className="truncate">
                                {sp.number} · {sp.title}
                              </span>
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-border space-y-2 border-t p-4">
        <div className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
          Session
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">当前会话</span>
          {mounted && currentSessionId ? (
            <Badge variant="outline" className="font-mono text-[10px]">
              {currentSessionId.slice(0, 10)}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              未选中
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground text-[11px] leading-relaxed">
          W9 接入 IndexedDB 真实 session store
        </div>
      </div>
    </aside>
  );
}
