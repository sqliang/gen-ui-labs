"use client";

import { ChevronDown } from "lucide-react";

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
import { BUILTIN_MODELS } from "@/core/models/registry";
import { useSessionStore } from "@/core/state/session-store";

/**
 * Lab 顶部模型选择条。
 *
 * - 选中项同步到 session-store（也写到 URL ?model=xxx，方便分享/前进后退）
 * - URL 是 source of truth；store 只是缓存
 */
export function LabTopbar() {
  const currentModelId = useSessionStore((s) => s.currentModelId);
  const setCurrentModel = useSessionStore((s) => s.setCurrentModel);

  const current = BUILTIN_MODELS.find((m) => m.id === currentModelId) ?? BUILTIN_MODELS[0];

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
    const url = new URL(window.location.href);
    url.searchParams.set("model", id);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <header className="bg-card text-card-foreground border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
      <DropdownMenu>
        <DropdownMenuTrigger className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="text-muted-foreground text-xs">模型</span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {current?.label ?? "（未选）"}
          </Badge>
          <ChevronDown className="text-muted-foreground size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>选择模型</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={currentModelId} onValueChange={handleModelChange}>
            {Object.entries(grouped).map(([provider, models]) => (
              <div key={provider}>
                <DropdownMenuLabel className="text-foreground/70 pt-2 text-[10px]">
                  {provider}
                </DropdownMenuLabel>
                {models.map((m) => (
                  <DropdownMenuRadioItem key={m.id} value={m.id}>
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{m.label.split("·")[1]?.trim() ?? m.id}</span>
                      <code className="text-muted-foreground text-[10px]">{m.id}</code>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </div>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>添加自定义模型（W2+）</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground hidden sm:inline">
          Agent pattern: <span className="text-foreground">ReAct</span>
        </span>
        <span className="text-muted-foreground hidden md:inline">
          <span className="text-foreground font-mono">v0.3</span> · W2 SSE
        </span>
      </div>
    </header>
  );
}
