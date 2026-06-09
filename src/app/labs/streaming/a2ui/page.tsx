import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function A2uiPlaceholder() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">1.1.3 A2UI 协议渲染</h1>
          <Badge variant="outline">W5 · 待实现</Badge>
        </div>
      </header>
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">占位</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground p-4 pt-0 text-sm leading-relaxed">
          W5 落地。计划：按 A2UI v0.2 规范解析
          <code className="text-foreground">surfaceUpdate</code> /
          <code className="text-foreground">dataModelUpdate</code> 等消息。
        </CardContent>
      </Card>
    </div>
  );
}
