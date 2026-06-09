"use client";

import { useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument } from "@/core/engine/json-ui/types";

/** 同一 UI 的 DSL 表达（JSON-UI 格式） */
const DSL_DOC: JsonUiDocument = {
  root: {
    type: "card",
    props: { title: "GenUI Labs · 混合演示" },
    children: [
      {
        type: "text",
        props: { content: "同一 UI，两种表达方式：JSON-UI DSL（左） vs TSX（右）" },
      },
      {
        type: "flex",
        props: {},
        children: [
          { type: "button", props: { label: "✅ DSL", variant: "default" } },
          { type: "button", props: { label: "✅ TSX", variant: "outline" } },
          { type: "button", props: { label: "📋 混合", variant: "outline" } },
        ],
      },
      {
        type: "table",
        props: {
          columns: ["Week", "Status"],
          rows: [
            ["W1", "✅"],
            ["W2", "✅"],
            ["W3", "✅"],
            ["W4", "✅"],
            ["W5", "✅"],
            ["W6", "✅"],
            ["W7", "✅"],
            ["W8", "✅"],
          ],
        },
      },
    ],
  },
};

/** 同等 TSX 代码（纯 JS DOM，沙箱执行） */
const TSX_CODE = `var card = document.createElement('div');
card.style.border = '1px solid #27272a';
card.style.borderRadius = '8px';
card.style.padding = '16px';
card.style.marginBottom = '12px';

var h3 = document.createElement('h3');
h3.style.fontSize = '14px';
h3.style.fontWeight = '600';
h3.style.marginBottom = '12px';
h3.textContent = 'GenUI Labs · 混合演示';
card.appendChild(h3);

var p = document.createElement('p');
p.style.color = '#a1a1aa';
p.style.fontSize = '13px';
p.style.marginBottom = '12px';
p.textContent = '同一 UI，两种表达方式：JSON-UI DSL（左） vs TSX（右）';
card.appendChild(p);

var flex = document.createElement('div');
flex.style.display = 'flex';
flex.style.gap = '8px';
flex.style.marginBottom = '12px';
['✅ DSL','✅ TSX','📋 混合'].forEach(function(label) {
  var btn = document.createElement('button');
  btn.textContent = label;
  btn.style.padding = '4px 12px';
  btn.style.borderRadius = '6px';
  btn.style.border = '1px solid #27272a';
  btn.style.background = label.indexOf('DSL')>=0 ? '#3b82f6' : 'transparent';
  btn.style.color = label.indexOf('DSL')>=0 ? 'white' : '#a1a1aa';
  btn.style.fontSize = '12px';
  btn.style.cursor = 'pointer';
  flex.appendChild(btn);
});
card.appendChild(flex);

var table = document.createElement('table');
table.style.width = '100%';
table.style.borderCollapse = 'collapse';
[['Week','Status'],['W1','✅'],['W2','✅'],['W3','✅'],['W4','✅'],['W5','✅'],['W6','✅'],['W7','✅'],['W8','✅']]
  .forEach(function(row, ri) {
    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #18181b';
    row.forEach(function(cell) {
      var td = document.createElement(ri===0?'th':'td');
      td.style.padding = '6px 8px';
      td.style.fontSize = '12px';
      td.style.textAlign = 'left';
      td.style.color = ri===0?'#a1a1aa':'#e5e5e5';
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
card.appendChild(table);

document.getElementById('root').appendChild(card);`;

export default function MixedPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const runTsx = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { id: Date.now(), code: TSX_CODE },
      window.location.origin,
    );
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">2.1.3 混合（DSL + TSX）</h1>
          <Badge variant="outline">W8 · 统一管道</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          同一 UI 的两种表达：JSON-UI DSL vs TSX 沙箱 → 对照评估
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {/* 左：JSON-UI DSL */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">
              JSON-UI DSL 管道
              <Badge variant="secondary" className="ml-2 text-[9px]">
                JsonUiRenderer
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="min-h-[20rem]">
              <JsonUiRenderer node={DSL_DOC.root} />
            </div>
          </CardContent>
        </Card>

        {/* 右：TSX 沙箱 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3">
            <CardTitle className="text-sm">
              TSX Sandbox 管道
              <Badge variant="secondary" className="ml-2 text-[9px]">
                eval → DOM → iframe
              </Badge>
            </CardTitle>
            <Button size="sm" onClick={runTsx}>
              运行 TSX
            </Button>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="border-muted min-h-[20rem] overflow-hidden rounded-md border">
              <iframe
                ref={iframeRef}
                src="/sandbox-iframe"
                title="sandbox-mixed"
                className="h-full w-full min-h-[20rem] border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 对照评估 */}
      <Card className="mt-4">
        <CardHeader className="p-3">
          <CardTitle className="text-sm">对照评估</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="text-primary font-bold">JSON-UI DSL</p>
              <p className="text-muted-foreground">
                ✅ 声明式，结构清晰
                <br />✅ 服务器可控（LLM 生成 DSL 比代码安全）
                <br />✅ 增量 patching（JSON Patch）
                <br />
                ⚠️ 表达能力有限（card/table/button/...）
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-primary font-bold">TSX Sandbox</p>
              <p className="text-muted-foreground">
                ✅ 图灵完备（任意 UI 均可表达）
                <br />✅ 开发者友好（熟悉的 JS）
                <br />
                ⚠️ 安全需要沙箱隔离
                <br />
                ⚠️ LLM 生成代码质量不稳定
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
