"use client";

import { useEffect } from "react";

/**
 * 全局 error boundary —— App Router 在任何未捕获的客户端错误时渲染。
 *
 * 区别于 not-found.tsx：error.tsx 是运行时错误（throw new Error(...)），
 * not-found.tsx 是路由不存在（notFound()）。两个都覆盖，UX 才完整。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 真要做监控就发到自研事件总线（PROPOSAL §3.1）
    // 现在先 console
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <p className="text-muted-foreground/60 font-mono text-[11px] tracking-widest uppercase">
          error · runtime
        </p>
        <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
          出了点问题
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          页面渲染时抛了一个未处理的异常。错误已记录，刷新或回首页可继续。
        </p>
        {error.digest ? (
          <p className="text-muted-foreground/60 mt-4 font-mono text-[11px]">
            digest: <code className="text-foreground/80">{error.digest}</code>
          </p>
        ) : null}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 font-mono text-[12px] transition-colors"
          >
            retry
          </button>
          <a
            href="/"
            className="border-foreground/20 hover:border-foreground/40 rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors"
          >
            back to home
          </a>
        </div>
      </div>
    </div>
  );
}
