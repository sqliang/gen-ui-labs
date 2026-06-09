"use client";

import { Bot, Code2, Eye, Radio } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useSessionStore } from "@/core/state/session-store";
import { cn } from "@/lib/utils";

const LAB_NAV = [
  { id: "streaming", label: "Streaming", icon: Radio },
  { id: "codegen", label: "Codegen", icon: Code2 },
  { id: "workbench", label: "Workbench", icon: Eye },
  { id: "observability", label: "Observability", icon: Bot },
] as const;

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

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <ul className="space-y-1">
          {LAB_NAV.map((item) => {
            const Icon = item.icon;
            const href = `/labs/${item.id}`;
            const active = pathname.startsWith(href);
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  <span>Lab · {item.label}</span>
                </Link>
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
