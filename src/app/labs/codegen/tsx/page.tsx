"use client";

import { useCallback, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_CODE = `// LLM 生成的 TSX 代码（在沙箱 iframe 执行）
// 可用：React.createElement（沙箱内无 JSX 编译器，用 createElement）

const el = React.createElement('div', { style: { padding: '16px' } },
  React.createElement('h2', { style: { fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' } }, 'GenUI Labs · Sandbox Demo'),
  React.createElement('p', { style: { color: '#a1a1aa', fontSize: '14px', marginBottom: '12px' } }, '这段代码在 sandbox iframe 中执行。'),
  React.createElement('button', {
    onClick: () => alert('Hello from sandbox!'),
    style: {
      backgroundColor: '#3b82f6', color: 'white', border: 'none',
      padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
    }
  }, '点我'),
  React.createElement('table', { style: { marginTop: '16px', borderCollapse: 'collapse', width: '100%' } },
    React.createElement('thead', {},
      React.createElement('tr', { style: { borderBottom: '1px solid #27272a' } },
        React.createElement('th', { style: { textAlign: 'left', padding: '8px', fontSize: '12px', color: '#a1a1aa' } }, 'Week'),
        React.createElement('th', { style: { textAlign: 'left', padding: '8px', fontSize: '12px', color: '#a1a1aa' } }, 'Status')
      )
    ),
    React.createElement('tbody', {},
      [['W1', '✅ 完成'], ['W2', '✅ 完成'], ['W6', '✅ 完成'], ['W7', '🔧 进行中']].map(([week, status]) =>
        React.createElement('tr', { key: week, style: { borderBottom: '1px solid #18181b' } },
          React.createElement('td', { style: { padding: '8px', fontSize: '13px' } }, week),
          React.createElement('td', { style: { padding: '8px', fontSize: '13px' } }, status)
        )
      )
    )
  )
);

// 返回根元素 → 在沙箱 body 显示
document.getElementById('root').appendChild(el);`;

export default function TsxPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [code, setCode] = useState(DEMO_CODE);
  const [result, setResult] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    setResult(null);
    setErrMsg(null);
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ id: Date.now(), code }, window.location.origin);
  }, [code]);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type !== "sandbox-result") return;
    if (event.data.ok) {
      setResult(event.data.result ?? "(empty)");
    } else {
      setErrMsg(event.data.error ?? "Unknown error");
    }
  }, []);

  // 监听 sandbox 回传
  if (typeof window !== "undefined") {
    window.addEventListener("message", handleMessage);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">2.1.1 TSX 代码生成</h1>
          <Badge variant="outline">W7 · Sandbox</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          LLM 生成 React TSX 代码 → iframe sandbox 安全执行 → 实时渲染
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {/* 左侧：代码编辑 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3">
            <CardTitle className="text-sm">代码（React.createElement）</CardTitle>
            <Button size="sm" onClick={handleRun}>
              运行
            </Button>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-muted border-input font-mono text-[11px] leading-relaxed w-full min-h-[24rem] rounded-md border p-3 focus:outline-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        {/* 右侧：渲染结果 */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">渲染结果（iframe sandbox）</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="border-muted min-h-[20rem] overflow-hidden rounded-md border">
                <iframe
                  ref={iframeRef}
                  src="/sandbox-iframe"
                  title="sandbox"
                  className="h-full w-full min-h-[20rem] border-0"
                  sandbox="allow-scripts"
                />
              </div>
            </CardContent>
          </Card>

          {result !== null ? (
            <Card className="border-green-500/50">
              <CardContent className="p-3 text-green-600 dark:text-green-400 font-mono text-[10px]">
                ✅ {result}
              </CardContent>
            </Card>
          ) : null}

          {errMsg ? (
            <Card className="border-destructive/50">
              <CardContent className="p-3 text-destructive font-mono text-[10px]">
                ❌ {errMsg}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
