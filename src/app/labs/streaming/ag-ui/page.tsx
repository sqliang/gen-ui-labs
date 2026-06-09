import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgUiPlaceholder() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">1.1.2 AG-UI 协议流式渲染</h1>
          <Badge variant="outline">W4 · 待实现</Badge>
        </div>
      </header>
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">占位</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground p-4 pt-0 text-sm leading-relaxed">
          W4 落地。计划：自研 ag-ui 客户端 reducer + 组件映射表，支持
          <code className="text-foreground">TEXT_MESSAGE_CONTENT</code> /
          <code className="text-foreground">TOOL_CALL_START</code> /
          <code className="text-foreground">STATE_DELTA</code> 等事件。
        </CardContent>
      </Card>
    </div>
  );
}
