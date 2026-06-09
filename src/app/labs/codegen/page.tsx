"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const labs = [
  {
    path: "/labs/codegen/json-ui",
    title: "2.1.2 JSON-UI DSL",
    status: "done",
    desc: "JSON-UI 声明式 DSL → React 递归渲染。card / table / button / chart。",
    features: "W6 落地：JsonUiRenderer + /api/json-ui mock 端点",
  },
  {
    path: "/labs/codegen/tsx",
    title: "2.1.1 TSX 代码生成",
    status: "done",
    desc: "LLM 生成 React 代码 → sandbox iframe 安全执行 → 实时渲染。",
    features: "W7 落地：core/engine/sandbox/ + postMessage 协议",
  },
  {
    path: "/labs/codegen/mixed",
    title: "2.1.3 混合（DSL + TSX）",
    status: "planned",
    desc: "LLM 自选 DSL 或 TSX → 统一渲染管道。",
    features: "W8+ 落地",
  },
];

export default function CodegenPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Lab 2 · Codegen</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          LLM 生成 UI 代码 / DSL → 渲染引擎 → 沙箱执行
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {labs.map((lab) => (
          <Card key={lab.path} className="flex flex-col">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{lab.title}</CardTitle>
                <Badge
                  variant="outline"
                  className={
                    lab.status === "done"
                      ? "border-green-500 text-green-600 text-[10px]"
                      : "text-[10px]"
                  }
                >
                  {lab.status === "done" ? "✅" : "📋"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 pt-0">
              <p className="text-muted-foreground mb-3 text-xs">{lab.desc}</p>
              <p className="text-muted-foreground mb-3 text-[10px]">{lab.features}</p>
              <Button asChild size="sm" variant="outline" className="mt-auto w-full">
                <Link href={lab.path}>{lab.status === "done" ? "打开" : "占位"}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
