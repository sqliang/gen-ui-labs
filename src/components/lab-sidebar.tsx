"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LABS, type LabDefinition } from "@/core/labs";

/**
 * 左侧 Lab 导航树。
 *
 * 设计：
 * - 桌面：固定宽 256px，展开
 * - 中等：固定 56px，只剩 icon
 * - 移动：完全收起为顶部一行 chip
 *
 * 强调色用每个 Lab 自己的 accent —— 激活时左边 2px 高亮条 + 背景 tint。
 */
export function LabSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* 桌面 / 中等屏幕侧栏 */}
      <aside
        className={`border-border/40 bg-sidebar/40 hidden shrink-0 border-r backdrop-blur-sm transition-[width] duration-200 md:flex md:flex-col ${
          collapsed ? "w-14" : "w-60"
        }`}
        aria-label="Lab 导航"
      >
        <div className="flex items-center justify-between px-3 pt-4 pb-2">
          {!collapsed && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
              labs
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hover:bg-secondary/40 text-muted-foreground hover:text-foreground ml-auto rounded-md p-1 transition-colors"
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
          >
            {collapsed ? (
              <ChevronsRight className="size-3.5" />
            ) : (
              <ChevronsLeft className="size-3.5" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 pb-4">
          {LABS.map((lab) => (
            <SidebarItem
              key={lab.id}
              lab={lab}
              active={pathname === lab.href || pathname.startsWith(`${lab.href}/`)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {!collapsed && (
          <div className="border-border/40 border-t px-4 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
            <div className="text-foreground/80">{"// 路线图"}</div>
            <div className="mt-1">w1–w4 · 协议 + 模型路由</div>
            <div>w5–w7 · 引擎 + sandbox</div>
            <div>w8–w12 · observability</div>
          </div>
        )}
      </aside>

      {/* 移动端：横向 chip */}
      <div className="border-border/40 bg-background/60 sticky top-12 z-30 border-b backdrop-blur-md md:hidden">
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2">
          {LABS.map((lab) => (
            <Link
              key={lab.id}
              href={lab.href}
              className="border-border/40 bg-secondary/30 hover:bg-secondary/60 shrink-0 rounded-md border px-2.5 py-1 font-mono text-[11px] text-foreground/80"
              style={{
                boxShadow: `inset 0 0 0 1px ${lab.accent.solid}00`,
              }}
            >
              {lab.number} · {lab.shortTitle}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function SidebarItem({
  lab,
  active,
  collapsed,
}: {
  lab: LabDefinition;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = lab.icon;
  return (
    <Link
      href={lab.href}
      title={collapsed ? lab.title : undefined}
      className="group relative flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors"
      style={{
        backgroundColor: active ? lab.accent.soft : "transparent",
        color: active ? lab.accent.solid : undefined,
      }}
    >
      {/* 激活态左侧高亮条 */}
      <span
        aria-hidden
        className={`absolute top-1.5 bottom-1.5 left-0 w-[2px] rounded-r transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundColor: lab.accent.solid }}
      />
      <Icon
        className="size-4 shrink-0"
        style={{ color: active ? lab.accent.solid : "currentColor" }}
      />
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-medium leading-none">{lab.shortTitle}</span>
            <span className="font-mono text-[9px] opacity-60">{lab.number}</span>
          </div>
          <div
            className="mt-0.5 truncate text-[11px] leading-none opacity-70"
            style={{ color: active ? lab.accent.solid : undefined }}
          >
            {lab.protocolLabel}
          </div>
        </div>
      )}
    </Link>
  );
}
