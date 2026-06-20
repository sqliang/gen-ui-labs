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
 *
 * Dark-mode 配色（重要）：
 * - Tailwind Typography 的 `prose-invert` 默认 oklch 灰在 zinc-950 上对比度不足
 * - 我们用语义 token (`text-foreground / text-muted-foreground / text-primary` 等)
 *   显式覆盖 prose 颜色，不依赖 prose 自带的 CSS 变量
 * - 渲染容器不依赖 prose 的默认 padding —— 由调用方控制
 */
export interface MarkdownRendererProps {
  /** Markdown 文本（可以是不完整的——流式场景下边生成边渲染） */
  source: string;
  /** 渲染中态（流式时显示一个 cursor） */
  isStreaming?: boolean;
  className?: string;
}

/**
 * 覆盖 @tailwindcss/typography 在 dark mode 下默认的灰阶。
 * 这些 token 来自 :root / .dark 的 --color-* CSS 变量（globals.css）。
 */
const PROSE_OVERRIDE = [
  // 文本与标题
  "text-foreground/90",
  "[&_h1]:text-foreground",
  "[&_h2]:text-foreground",
  "[&_h3]:text-foreground",
  "[&_h4]:text-foreground",
  "[&_h5]:text-foreground",
  "[&_h6]:text-foreground",
  // 链接
  "[&_a]:text-sky-300 [&_a]:underline-offset-2 [&_a]:hover:underline",
  // strong / em
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_em]:text-foreground/85",
  // 行内 code
  "[&_:not(pre)>code]:bg-foreground/[0.08]",
  "[&_:not(pre)>code]:text-foreground",
  "[&_:not(pre)>code]:border-[1px]",
  "[&_:not(pre)>code]:border-foreground/[0.08]",
  "[&_:not(pre)>code]:rounded",
  "[&_:not(pre)>code]:px-1.5",
  "[&_:not(pre)>code]:py-0.5",
  "[&_:not(pre)>code]:font-mono",
  "[&_:not(pre)>code]:text-[0.875em]",
  "[&_:not(pre)>code]:before:hidden",
  "[&_:not(pre)>code]:after:hidden",
  // code 块（pre）
  "[&_pre]:bg-[#0d1117]",
  "[&_pre]:border",
  "[&_pre]:border-foreground/10",
  "[&_pre]:rounded-lg",
  "[&_pre]:px-4",
  "[&_pre]:py-3",
  "[&_pre]:my-3",
  "[&_pre]:overflow-x-auto",
  "[&_pre_code]:bg-transparent",
  "[&_pre_code]:border-0",
  "[&_pre_code]:p-0",
  // blockquote
  "[&_blockquote]:border-l-2",
  "[&_blockquote]:border-primary/50",
  "[&_blockquote]:bg-primary/[0.04]",
  "[&_blockquote]:text-foreground/75",
  "[&_blockquote]:not-italic",
  "[&_blockquote]:px-3",
  "[&_blockquote]:py-1",
  "[&_blockquote]:my-3",
  // 列表
  "[&_ul]:list-disc",
  "[&_ol]:list-decimal",
  "[&_li]:marker:text-muted-foreground/60",
  // 表格
  "[&_table]:text-foreground/85",
  "[&_thead]:border-b",
  "[&_thead]:border-foreground/15",
  "[&_th]:text-foreground/90",
  "[&_th]:font-semibold",
  "[&_td]:border-t",
  "[&_td]:border-foreground/10",
  // hr
  "[&_hr]:border-foreground/10",
  "[&_hr]:my-4",
  // 间距收紧（避免 prose 默认的 2rem 上下间距）
  "[&_h1]:text-2xl [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:text-xl [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-semibold [&_h2]:tracking-tight",
  "[&_h3]:text-base [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:font-semibold",
  "[&_p]:my-2 [&_p]:leading-relaxed",
  "[&_li]:my-0.5 [&_li]:leading-relaxed",
];

export function MarkdownRenderer({
  source,
  isStreaming = false,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn("text-sm", className)}>
      <div className={cn(PROSE_OVERRIDE)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // 让 a 标签默认在新窗口打开（流式场景下外链频繁）
            a: ({ href, children, ...rest }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                {children}
              </a>
            ),
          }}
        >
          {source}
        </ReactMarkdown>
      </div>
      {isStreaming ? (
        <span className="bg-primary ml-0.5 inline-block h-3 w-1.5 animate-pulse align-middle" />
      ) : null}
    </div>
  );
}
