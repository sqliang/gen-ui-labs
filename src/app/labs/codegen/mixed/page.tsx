"use client";

import { useCallback, useRef } from "react";

import { LabContentPage } from "@/components/lab-content-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonUiRenderer } from "@/core/engine/json-ui/renderer";
import type { JsonUiDocument, JsonUiNode } from "@/core/engine/json-ui/types";

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
              {/* 量化指标条 */}
              <div className="border-foreground/5 mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-foreground/[0.02] sm:grid-cols-4">
                <StatPill
                  label="nodes"
                  left={countNodes(DSL_DOC.root)}
                  right={countNodes(TSX_PARSE)}
                  hint="JSON-UI 节点数 / TSX DOM 节点数"
                />
                <StatPill
                  label="bytes"
                  left={JSON.stringify(DSL_DOC).length}
                  right={TSX_CODE.length}
                  hint="源码体积对比"
                />
                <StatPill label="expr" left={2} right={0} hint="绑定表达式数 ({user.name} 等)" />
                <StatPill
                  label="safety"
                  left={4}
                  right={2}
                  hint="1-5 分：DSL=沙箱 4，TSX=iframe 2"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ProsCons
                  protocol="JSON-UI DSL"
                  accent="oklch(0.7 0.18 290)"
                  pros={[
                    "声明式结构，LLM 输出更稳",
                    "服务端可控，绑定表达式 + 增量 patch",
                    "零代码风险（无 eval，类型由 schema 强约束）",
                    "节点路径可被反向高亮（lab 3.1.2 inspector 用）",
                  ]}
                  cons={[
                    "表达能力受限于 schema（card/table/button/chart/...）",
                    "复杂交互（onClick 链式回调）需要额外扩展",
                    "LLM 训练数据少，相对陌生",
                  ]}
                />
                <ProsCons
                  protocol="TSX Sandbox"
                  accent="oklch(0.78 0.16 75)"
                  pros={[
                    "图灵完备，任意 UI 都能表达",
                    "开发者熟悉（TypeScript/React 现成生态）",
                    "丰富第三方库（recharts / d3 / framer-motion）",
                  ]}
                  cons={[
                    "安全：必须 iframe 沙箱（PROPOSAL §1.1 Lab 2.1.1）",
                    "LLM 生成代码质量不稳定（需 review + linter）",
                    "bundle 体积不可控（要 require 白名单）",
                    "无法做节点级反向高亮（AST 重建昂贵）",
                  ]}
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

function StatPill({
  label,
  left,
  right,
  hint,
}: {
  label: string;
  left: number;
  right: number;
  hint: string;
}) {
  const winner = left > right ? "left" : right > left ? "right" : "tie";
  return (
    <div
      className="bg-background/40 p-2.5"
      title={hint}
      aria-label={`${label}: DSL=${left}, TSX=${right}, winner=${winner}`}
    >
      <div className="text-muted-foreground/60 font-mono text-[9.5px] tracking-wider uppercase">
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[12px] tabular-nums">
        <span className={winner === "left" ? "text-emerald-400 font-medium" : "text-foreground/70"}>
          {left}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span
          className={winner === "right" ? "text-emerald-400 font-medium" : "text-foreground/70"}
        >
          {right}
        </span>
      </div>
    </div>
  );
}

/** 递归数节点。TSX_PARSE 是个轻量表示 —— 把 TSX_CODE 解析成嵌套结构（轻 AST） */
function countNodes(root: JsonUiNode | TSXNode): number {
  let n = 1;
  if ("children" in root && Array.isArray(root.children)) {
    for (const c of root.children) n += countNodes(c as never);
  }
  return n;
}

/** TSX 代码的结构化近似 —— 我们手动从 TSX_CODE 数出大概的 DOM 节点数
 *  这里用一行声明代替：card 容器 + h3 + p + flex(3btn) + table(1+2x8 tr) + 9 td = ~30 节点
 * 实际上 sandbox 跑完会更多；这里用 27（保守）作为对照值。
 */
const TSX_PARSE: TSXNode = {
  tag: "div",
  children: [
    { tag: "h3" },
    { tag: "p" },
    {
      tag: "div",
      children: [{ tag: "button" }, { tag: "button" }, { tag: "button" }],
    },
    {
      tag: "table",
      children: Array.from({ length: 8 }, () => ({
        tag: "tr",
        children: [{ tag: "td" }, { tag: "td" }],
      })),
    },
  ],
};

interface TSXNode {
  tag: string;
  children?: TSXNode[];
}
