"use client";

import { Bot, Code2, Eye, Radio } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LAB_NAV = [
  { id: "streaming", label: "Streaming", icon: Radio },
  { id: "codegen", label: "Codegen", icon: Code2 },
  { id: "workbench", label: "Workbench", icon: Eye },
  { id: "observability", label: "Observability", icon: Bot },
] as const;

export function LabSidebar() {
  const pathname = usePathname();

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
        <div className="text-muted-foreground text-xs">
          当前会话
          <Badge variant="outline" className="ml-2 font-mono text-[10px]">
            demo
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">W9 接入 IndexedDB 真实 session store</div>
      </div>
    </aside>
  );
}
