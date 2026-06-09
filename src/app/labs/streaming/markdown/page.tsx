"use client";

import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStreamingStore } from "@/core/state/streaming-store";

/**
 * Lab 1.1.1 Markdown 流式渲染（W1 占位，W3 接入真实 SSE）。
 */
export default function MarkdownStreamingPage() {
  const { accumulatedText, isStreaming, start, append, finish, reset } = useStreamingStore();

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const simulateStream = async () => {
    start("markdown");
    const sample = `# Markdown 流式渲染

这是一个**流式渲染**的演示。W1 阶段先模拟 SSE 推送，W3 接入真实 LLM 流。

## 它能做什么

- 边生成边渲染（不需要等全部内容）
- 自动处理 Markdown 语法
- 支持代码高亮、表格、引用块

> 注意：当前 demo 仅为占位，渲染走本地 setTimeout 模拟。

\`\`\`ts
import { useStreamingStore } from "@/core/state/streaming-store";
\`\`\`
`;
    // 每 30ms 推送一个 chunk，模拟流式
    for (let i = 0; i < sample.length; i += 8) {
      const delta = sample.slice(i, i + 8);
      append({ kind: "text", delta });
      await new Promise((r) => setTimeout(r, 30));
    }
    append({ kind: "control", type: "end" });
    finish();
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">1.1.1 Markdown 流式渲染</h1>
          <Badge variant="outline">W1 · 占位</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          W3 接入真实 SSE 通道（<code className="text-foreground">/api/chat</code>）。
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        <Button onClick={simulateStream} disabled={isStreaming}>
          {isStreaming ? "渲染中…" : "模拟一次流式渲染"}
        </Button>
        <Button onClick={reset} variant="outline" disabled={isStreaming}>
          清空
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
          <CardTitle className="text-sm">输出</CardTitle>
          {isStreaming ? (
            <Badge variant="secondary" className="font-mono text-[10px]">
              streaming…
            </Badge>
          ) : accumulatedText.length > 0 ? (
            <Badge variant="outline" className="font-mono text-[10px]">
              done
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <pre className="bg-muted text-foreground max-h-96 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap scrollbar-thin">
            {accumulatedText || (
              <span className="text-muted-foreground">（点击「模拟一次流式渲染」开始）</span>
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
