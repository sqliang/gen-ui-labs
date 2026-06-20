"use client";

import { ChevronDown, Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { BUILTIN_MODELS } from "@/core/models/registry";
import { useSessionStore } from "@/core/state/session-store";
import { useUiStore } from "@/core/state/ui-store";

/**
 * 顶部栏 —— 站点 logo + 状态点 + 模型选择器 + 主题切换 + 导航。
 *
 * 全站可见（任何路由都显示）。模型选择同步到 URL ?model=xxx，
 * 主题选择存到 localStorage + 同步到 <html class="dark">。
 */
export function SiteHeader() {
  return (
    <header className="bg-background/70 supports-[backdrop-filter]:bg-background/50 sticky top-0 z-40 border-b border-white/5 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-3 px-5">
        <Logo />
        <span className="hidden items-center gap-1.5 font-mono text-[10px] text-muted-foreground sm:flex">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_oklch(0.7_0.18_150)]" />
          v0.1 · w4
        </span>
        <Separator orientation="vertical" className="hidden h-4 bg-white/10 sm:block" />
        <PrimaryNav />
        <div className="ml-auto flex items-center gap-2">
          <CommandHint />
          <ModelSwitcher />
          <ThemeSwitcher />
          <AboutLink />
          <SrcLink />
        </div>
      </div>
    </header>
  );
}

/* ────── 子组件 ────── */

function Logo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 font-mono text-[13px] font-medium tracking-tight"
    >
      <LogoMark className="text-foreground size-5 transition-transform group-hover:rotate-12" />
      <span>
        <span className="text-foreground/90">genui</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground">labs</span>
      </span>
    </Link>
  );
}

function PrimaryNav() {
  // 只在 /labs/* 下显示绝对路径面包屑（保持首页顶栏简洁）
  return (
    <nav className="hidden items-center gap-1 font-mono text-[11px] text-muted-foreground md:flex">
      <Link href="/labs/streaming" className="hover:text-foreground/80 transition-colors">
        ~/streaming
      </Link>
      <Link href="/labs/codegen" className="hover:text-foreground/80 transition-colors">
        ~/codegen
      </Link>
      <Link href="/labs/workbench" className="hover:text-foreground/80 transition-colors">
        ~/workbench
      </Link>
      <Link href="/labs/observability" className="hover:text-foreground/80 transition-colors">
        ~/observability
      </Link>
    </nav>
  );
}

function ModelSwitcher() {
  const currentModelId = useSessionStore((s) => s.currentModelId);
  const setCurrentModel = useSessionStore((s) => s.setCurrentModel);
  const current = BUILTIN_MODELS.find((m) => m.id === currentModelId) ?? BUILTIN_MODELS[0];
  if (!current) return null;

  // 按 provider 分组
  const grouped: Record<string, typeof BUILTIN_MODELS> = {};
  for (const m of BUILTIN_MODELS) {
    const bucket = grouped[m.provider] ?? [];
    bucket.push(m);
    grouped[m.provider] = bucket;
  }

  const handleModelChange = (id: string) => {
    setCurrentModel(id);
    // 用 history.replaceState 避免触发导航/suspense
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("model", id);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-muted/60 flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="text-muted-foreground/70">model</span>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {current.label.split("·")[1]?.trim() ?? current.id}
        </Badge>
        <ChevronDown className="text-muted-foreground size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>选择模型</span>
          <span className="text-muted-foreground/70 font-mono text-[10px]">
            {BUILTIN_MODELS.length} models · 6 providers
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={currentModelId} onValueChange={handleModelChange}>
          {Object.entries(grouped).map(([provider, models]) => (
            <div key={provider}>
              <DropdownMenuLabel className="text-foreground/70 pt-2 text-[10px] uppercase tracking-wider">
                {provider}
              </DropdownMenuLabel>
              {models.map((m) => (
                <DropdownMenuRadioItem key={m.id} value={m.id}>
                  <span className="flex w-full items-center justify-between gap-2">
                    <span>{m.label.split("·")[1]?.trim() ?? m.id}</span>
                    <code className="text-muted-foreground font-mono text-[10px]">{m.id}</code>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-muted-foreground/60">
          自定义 provider · W8+
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeSwitcher() {
  const themeMode = useUiStore((s) => s.themeMode);
  const setTheme = useUiStore((s) => s.setTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // mount 前默认 dark（避免 hydration mismatch）
  const isDark = mounted
    ? themeMode === "dark" ||
      (themeMode === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    : true;

  const handle = () => {
    // 简化：dark ↔ light 切换（system 太复杂，先隐藏）
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={handle}
      className="hover:bg-muted/60 flex size-7 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={isDark ? "切换到浅色" : "切换到深色"}
      title={isDark ? "切换到浅色" : "切换到深色"}
    >
      {isDark ? (
        <Moon className="text-foreground/80 size-3.5" />
      ) : (
        <Sun className="text-amber-500 size-3.5" />
      )}
    </button>
  );
}

function AboutLink() {
  return (
    <Link
      href="/about"
      className="border-border/40 hover:border-border hover:bg-secondary/40 hidden rounded-md border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
    >
      about
    </Link>
  );
}

function CommandHint() {
  const toggleCommand = useUiStore((s) => s.toggleCommand);
  return (
    <button
      type="button"
      onClick={toggleCommand}
      className="border-border/40 hover:border-border hover:bg-secondary/40 hidden items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground lg:flex"
      aria-label="Open command palette (Cmd+K)"
    >
      <Search className="size-3" />
      <span>search</span>
      <kbd className="text-muted-foreground/70 border-foreground/15 ml-1 rounded border px-1 font-mono text-[9.5px]">
        ⌘K
      </kbd>
    </button>
  );
}

function SrcLink() {
  return (
    <a
      href="https://github.com/sqliang/gen-ui-labs"
      target="_blank"
      rel="noreferrer noopener"
      className="border-border/40 hover:border-border hover:bg-secondary/40 hidden rounded-md border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
    >
      src ↗
    </a>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="GenUI Labs logo"
    >
      <rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.85" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="1" />
    </svg>
  );
}
