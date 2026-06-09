"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * core/render/markdown-renderer.tsx
 *
 * 通用 Markdown 渲染组件（GenUI Labs Shared Core）。
 *
 * 特性：
 * - 支持 GFM（GitHub Flavored Markdown）：表格、删除线、任务列表
 * - 代码块语法高亮（rehype-highlight + highlight.js）
 * - 流式友好：每次 source 变更就 re-render（react-markdown 内部 memo）
 * - 主题色用 Tailwind 语义 token（foreground/muted/primary ...）
 * - className 可被 Lab 层覆盖
 *
 * W3 范围：
 * - 静态 + 流式两种用法都支持
 * - 不处理协议层（AG-UI / A2UI 占位见 protocol 章节，W4+）
 */
export interface MarkdownRendererProps {
  /** Markdown 文本（可以是不完整的——流式场景下边生成边渲染） */
  source: string;
  /** 渲染中态（流式时显示一个 cursor） */
  isStreaming?: boolean;
  className?: string;
}

export function MarkdownRenderer({
  source,
  isStreaming = false,
  className,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // 紧凑：避免 prose 默认的 2rem 上下间距
        "prose-headings:mt-4 prose-headings:mb-2",
        "prose-p:my-2 prose-li:my-0.5",
        "prose-pre:my-2 prose-pre:py-3 prose-pre:px-4",
        "prose-code:before:hidden prose-code:after:hidden",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 让 a 标签默认在新窗口打开（流式场景下外链频繁）
          a: ({ href, children, ...rest }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
              {...rest}
            >
              {children}
            </a>
          ),
          // pre 标签的 hljs 类交给 highlight.js，prose 的样式自动接管
          pre: ({ className: preCls, children, ...rest }) => (
            <pre className={cn("hljs bg-muted overflow-x-auto rounded-md p-3", preCls)} {...rest}>
              {children}
            </pre>
          ),
          // code 块（非 pre 内的 inline）显式样式
          code: ({ className: codeCls, children, ...rest }) => (
            <code
              className={cn(
                "bg-muted text-foreground rounded px-1 py-0.5 font-mono text-[0.85em]",
                codeCls,
              )}
              {...rest}
            >
              {children}
            </code>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
      {isStreaming ? (
        <span className="bg-primary ml-0.5 inline-block h-3 w-1.5 animate-pulse" />
      ) : null}
    </div>
  );
}
