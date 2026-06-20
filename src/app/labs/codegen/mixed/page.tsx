"use client";

import { useCallback, useRef } from "react";

import { LabContentPage } from "@/components/lab-content-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument } from "@/core/engine/json-ui/types";

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
    <LabContentPage
      labId="codegen"
      subNumber="2.1.3"
      title="混合（DSL + TSX）"
      protocolLabel="W8 · 统一管道"
      description="同一 UI 的两种表达：JSON-UI DSL 走 React 组件树（左） vs TSX 走 sandbox iframe（右）。对照评估两种管道的开发成本、安全性、表达能力。"
      onStart={runTsx}
      startLabel="运行 TSX"
      outputTitle="dsl vs tsx · side-by-side"
      output={
        <div className="space-y-4">
          {/* 双栏对比 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 左：JSON-UI DSL */}
            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  json-ui dsl
                  <span className="text-muted-foreground/70 ml-1.5 font-normal">
                    · JsonUiRenderer
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="min-h-[24rem]">
                  <JsonUiRenderer node={DSL_DOC.root} />
                </div>
              </CardContent>
            </Card>

            {/* 右：TSX Sandbox */}
            <Card className="bg-card/30 border-foreground/5">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                  tsx sandbox
                  <span className="text-muted-foreground/70 ml-1.5 font-normal">
                    · eval → DOM → iframe
                  </span>
                </CardTitle>
                <Button size="sm" onClick={runTsx} className="h-7 px-2 text-[10.5px]">
                  运行 TSX
                </Button>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="border-foreground/10 min-h-[24rem] overflow-hidden rounded-md border">
                  <iframe
                    ref={iframeRef}
                    src="/sandbox-iframe"
                    title="sandbox-mixed"
                    className="h-full w-full min-h-[24rem] border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 对照评估 */}
          <Card className="bg-card/30 border-foreground/5">
            <CardHeader className="p-3">
              <CardTitle className="font-mono text-[11px] tracking-wide uppercase">
                trade-offs · 评估对照
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ProsCons
                  protocol="JSON-UI DSL"
                  accent="oklch(0.7 0.18 290)"
                  pros={[
                    "声明式，结构清晰",
                    "服务器可控（LLM 生成 DSL 比代码安全）",
                    "增量 patching（JSON Patch）",
                  ]}
                  cons={["表达能力有限（card/table/button/...）"]}
                />
                <ProsCons
                  protocol="TSX Sandbox"
                  accent="oklch(0.78 0.16 75)"
                  pros={["图灵完备（任意 UI 均可表达）", "开发者友好（熟悉的 JS）"]}
                  cons={["安全需要沙箱隔离", "LLM 生成代码质量不稳定"]}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}

function ProsCons({
  protocol,
  accent,
  pros,
  cons,
}: {
  protocol: string;
  accent: string;
  pros: string[];
  cons: string[];
}) {
  return (
    <div
      className="bg-card/40 border-foreground/10 rounded-lg border p-3"
      style={{ boxShadow: `inset 0 0 0 1px ${accent.replace(")", " / 0.3)")}` }}
    >
      <div
        className="mb-2 font-mono text-[11px] font-bold tracking-wide uppercase"
        style={{ color: accent }}
      >
        {protocol}
      </div>
      <ul className="space-y-1 text-[12px]">
        {pros.map((p) => (
          <li key={p} className="text-foreground/85 flex items-start gap-1.5 leading-relaxed">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>{p}</span>
          </li>
        ))}
        {cons.map((c) => (
          <li key={c} className="text-foreground/85 flex items-start gap-1.5 leading-relaxed">
            <span className="text-amber-400 mt-0.5">⚠</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
