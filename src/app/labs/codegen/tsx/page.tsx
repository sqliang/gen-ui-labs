"use client";

import { Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { LabContentPage } from "@/components/lab-content-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_CODE = `// LLM 生成的 JS 代码（在 sandbox iframe 执行）
// 直接操作 DOM 创建 UI 元素

var h2 = document.createElement('h2');
h2.style.fontSize = '18px';
h2.style.fontWeight = 'bold';
h2.style.marginBottom = '8px';
h2.textContent = 'GenUI Labs · Sandbox Demo';

var p = document.createElement('p');
p.style.color = '#a1a1aa';
p.style.fontSize = '14px';
p.style.marginBottom = '12px';
p.textContent = '这段代码在 sandbox iframe 中安全执行。';

var btn = document.createElement('button');
btn.textContent = '点我';
btn.style.backgroundColor = '#3b82f6';
btn.style.color = 'white';
btn.style.border = 'none';
btn.style.padding = '8px 16px';
btn.style.borderRadius = '6px';
btn.style.cursor = 'pointer';
btn.style.fontSize = '14px';
btn.onclick = function() { alert('Hello from sandbox!'); };

var table = document.createElement('table');
table.style.marginTop = '16px';
table.style.borderCollapse = 'collapse';
table.style.width = '100%';

var thead = document.createElement('thead');
var trHead = document.createElement('tr');
trHead.style.borderBottom = '1px solid #27272a';
var th1 = document.createElement('th');
th1.style.textAlign = 'left';
th1.style.padding = '8px';
th1.style.fontSize = '12px';
th1.style.color = '#a1a1aa';
th1.textContent = 'Week';
var th2 = th1.cloneNode();
th2.textContent = 'Status';
trHead.appendChild(th1);
trHead.appendChild(th2);
thead.appendChild(trHead);
table.appendChild(thead);

var tbody = document.createElement('tbody');
[['W1', '✅'], ['W2', '✅'], ['W3', '✅'], ['W4', '✅'], ['W5', '✅'], ['W6', '✅'], ['W7', '✅']]
  .forEach(function(row) {
    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #18181b';
    var td1 = document.createElement('td');
    td1.style.padding = '8px';
    td1.style.fontSize = '13px';
    td1.textContent = row[0];
    var td2 = td1.cloneNode();
    td2.textContent = row[1];
    tr.appendChild(td1);
    tr.appendChild(td2);
    tbody.appendChild(tr);
  });
table.appendChild(tbody);

document.getElementById('root').appendChild(h2);
document.getElementById('root').appendChild(p);
document.getElementById('root').appendChild(btn);
document.getElementById('root').appendChild(table);
`;

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

  const handleReset = useCallback(() => {
    setCode(DEMO_CODE);
    setResult(null);
    setErrMsg(null);
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type !== "sandbox-result") return;
    if (event.data.ok) {
      setResult(event.data.result ?? "(empty)");
    } else {
      setErrMsg(event.data.error ?? "Unknown error");
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const errorMsg = errMsg;

  return (
    <LabContentPage
      labId="codegen"
      subNumber="2.1.1"
      title="TSX 代码生成"
      protocolLabel="W7 · Sandbox iframe"
      description="LLM 生成 React/TSX 代码 → 编译成 createElement → 在 sandbox iframe 中安全执行 → 实时渲染。所有 DOM 操作隔离在 iframe 内，主页面安全。"
      onStart={handleRun}
      onReset={handleReset}
      startLabel="运行"
      errorMsg={errorMsg}
      outputTitle="code editor + sandbox output"
      outputExtra={
        result ? <span className="font-mono text-[10px] text-emerald-300">✓ {result}</span> : null
      }
      output={
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 左：代码编辑 */}
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="flex flex-row items-center justify-between p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                generated code
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="h-7 px-2 text-[10.5px]"
                >
                  <RotateCcw className="size-3" /> 重置
                </Button>
                <Button size="sm" onClick={handleRun} className="h-7 gap-1 px-2 text-[10.5px]">
                  <Play className="size-3" /> 运行
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-[#0d1117] border-foreground/10 text-foreground/90 placeholder:text-muted-foreground/40 focus-visible:border-foreground/30 w-full min-h-[28rem] rounded-md border p-3 font-mono text-[11.5px] leading-relaxed focus-visible:outline-none"
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {/* 右：渲染结果 */}
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                sandbox output
                <span className="text-muted-foreground/70 ml-1.5 font-normal">
                  (iframe · allow-scripts)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="border-foreground/10 min-h-[28rem] overflow-hidden rounded-md border">
                <iframe
                  ref={iframeRef}
                  src="/sandbox-iframe"
                  title="sandbox"
                  className="h-full w-full min-h-[28rem] border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}
