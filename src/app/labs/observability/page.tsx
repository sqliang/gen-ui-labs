"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useObservabilityStore } from "@/core/state/observability-store";

export default function ObservabilityPage() {
  const { tokenUsageByModel, toolCalls, reasoning, agentPattern, isRecording } =
    useObservabilityStore();

  const models = Object.entries(tokenUsageByModel);
  const totalPrompt = models.reduce((s, [, u]) => s + u.prompt, 0);
  const totalCompletion = models.reduce((s, [, u]) => s + u.completion, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">Lab 4 · Observability</h1>
          <Badge variant="outline">W11 · Agent 可观测</Badge>
          {isRecording ? (
            <Badge variant="default" className="font-mono text-[10px]">
              🔴 recording
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-mono text-[10px]">
              ⏸ idle
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Token 消耗 / 工具调用 / Agent 推理链 —— 全链路可观测
        </p>
      </header>

      {/* Token 统计 */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-muted-foreground text-[10px]">累计 Token</div>
            <div className="text-2xl font-bold">{totalPrompt + totalCompletion}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-muted-foreground text-[10px]">Prompt</div>
            <div className="text-xl font-bold">{totalPrompt}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-muted-foreground text-[10px]">Completion</div>
            <div className="text-xl font-bold">{totalCompletion}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-muted-foreground text-[10px]">首 Token 延迟</div>
            <div className="text-xl font-bold">
              {models.length > 0 && models[0]
                ? `${models[0][1].firstTokenLatencyMs ?? "-"}ms`
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 按模型切分 */}
      <Card className="mb-4">
        <CardHeader className="p-3">
          <CardTitle className="text-sm">
            Token 按模型
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              ({models.length} models)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {models.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-[10px]">
                  <th className="pb-2 pr-4 font-medium">模型</th>
                  <th className="pb-2 pr-4 font-medium">Prompt</th>
                  <th className="pb-2 pr-4 font-medium">Completion</th>
                  <th className="pb-2 pr-4 font-medium">首 Token</th>
                </tr>
              </thead>
              <tbody>
                {models.map(([model, usage]) => (
                  <tr key={model} className="border-muted border-t">
                    <td className="py-1.5 pr-4 font-mono text-xs">{model}</td>
                    <td className="py-1.5 pr-4">{usage.prompt}</td>
                    <td className="py-1.5 pr-4">{usage.completion}</td>
                    <td className="py-1.5 pr-4">
                      {usage.firstTokenLatencyMs ? `${usage.firstTokenLatencyMs}ms` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground text-sm">
              在 markdown 页用 api 模式跑一次流式，这里就有数据了。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 工具调用 + 推理链 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">
              工具调用
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                ({toolCalls.length} calls)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {toolCalls.length > 0 ? (
              <pre className="bg-muted max-h-[16rem] overflow-auto rounded p-2 font-mono text-[9px]">
                {toolCalls.map((tc, i) => (
                  <div key={tc.id ?? i} className="border-muted border-b pb-1 mb-1">
                    <span className="text-primary font-bold">{tc.name}</span>{" "}
                    {tc.durationMs ? `(${tc.durationMs}ms)` : ""}
                    {"\n"}
                    {tc.error ? `❌ ${tc.error}` : "✅"}
                  </div>
                ))}
              </pre>
            ) : (
              <p className="text-muted-foreground text-sm">
                用 AG-UI tools scenario 触发工具调用。
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">
              Agent 推理链
              <Badge variant="secondary" className="ml-2 text-[9px]">
                {agentPattern}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {reasoning.length > 0 ? (
              <div className="max-h-[16rem] overflow-auto space-y-2">
                {reasoning.map((step) => (
                  <div key={step.id} className="bg-muted rounded p-2 text-[10px]">
                    <span className="text-primary font-bold">{step.type}</span>
                    <span className="text-muted-foreground ml-1 text-[8px]">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                    <p className="mt-0.5">{step.content.slice(0, 100)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">暂无推理记录。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
