"use client";

import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BUILTIN_MODELS } from "@/core/state/session-store";

export function LabTopbar() {
  // 占位：W2 接入真实模型选择器（下拉 + 模型状态指示）
  const model = BUILTIN_MODELS[0] ?? null;

  return (
    <header className="bg-card text-card-foreground border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-xs">模型</span>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {model?.label ?? "（未选）"}
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground hidden sm:inline">
          <Bot className="mr-1 inline size-3" />
          Agent pattern: <span className="text-foreground">ReAct</span>
        </span>
        <span className="text-muted-foreground hidden md:inline">
          <span className="text-foreground font-mono">v0.1</span> · W1 scaffold
        </span>
      </div>
    </header>
  );
}
