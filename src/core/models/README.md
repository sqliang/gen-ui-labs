# `core/models`

多模型 provider 路由。

```ts
interface ModelProvider {
  id: string;
  listModels(): Promise<ModelInfo[]>;
  stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<StreamChunk>;
  generate(req: ChatRequest): Promise<ChatResponse>;
}
```

计划支持：OpenAI、Anthropic、Google、DeepSeek、Qwen（DashScope）、Ollama（本地）。

W2 落地。