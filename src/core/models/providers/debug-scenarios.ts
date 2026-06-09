import type { RenderableEvent } from "@/core/state/streaming-store";

/** 调试场景：mock 引擎支持的 scenario */
export type MockScenario = "default" | "long" | "tools" | "error" | "reconnect";

/** Scenario 脚本接口：拉 prompt + signal，按需 yield chunks */
export type MockScript = (prompt: string, signal: AbortSignal) => AsyncIterable<RenderableEvent>;

/** default scenario：按 prompt 关键词匹配，输出 4 段固定文本 */
export const defaultScenario: MockScript = async function* (prompt, signal) {
  yield { kind: "control", type: "start" };
  await sleep(200, signal);
  if (signal.aborted) return;

  const reply = pickByKeyword(prompt);
  for (let i = 0; i < reply.length; i += 8) {
    if (signal.aborted) return;
    yield { kind: "text", delta: reply.slice(i, i + 8) };
    await sleep(30, signal);
  }
  yield { kind: "control", type: "end" };
};

/**
 * long scenario：~3000 字符，3 秒持续推。
 * 验证：长流稳定性、observability 累计 token、AbortController 中断。
 */
export const longScenario: MockScript = async function* (_, signal) {
  yield { kind: "control", type: "start" };
  await sleep(150, signal);
  if (signal.aborted) return;

  // 一篇关于 GenUI Labs 的假 Lorem Ipsum
  const content = longSampleText();
  // 每 12 字符一个 chunk，约 250 个 chunk
  for (let i = 0; i < content.length; i += 12) {
    if (signal.aborted) return;
    yield { kind: "text", delta: content.slice(i, i + 12) };
    await sleep(10, signal); // 紧凑：~10ms/chunk × 250 = 2.5s
  }
  yield { kind: "control", type: "end" };
};

/**
 * tools scenario：模拟 1 个 tool_call + 1 个 tool_result + 1 段文本。
 * 用途：Lab 1.1.2 AG-UI 协议（W4-3 留好的接口）；也是 markdown 页能演示
 * 工具调用视觉效果。
 */
export const toolsScenario: MockScript = async function* (prompt, signal) {
  yield { kind: "control", type: "start" };
  await sleep(150, signal);
  if (signal.aborted) return;

  // 工具调用：搜索 GenUI Labs
  yield {
    kind: "tool",
    name: "web_search",
    args: { query: `GenUI Labs ${prompt}`.trim() || "GenUI Labs" },
  };
  await sleep(500, signal);
  if (signal.aborted) return;

  // 工具结果
  yield {
    kind: "tool",
    name: "web_search",
    args: { query: `GenUI Labs ${prompt}`.trim() || "GenUI Labs" },
    // biome-ignore lint/suspicious/noExplicitAny: 测试用动态字段
    result: { results: ["GenUI Labs 是面向 GenUI 的实验性工作台", "GenUI Labs W1 已完成"] } as any,
  };
  await sleep(300, signal);
  if (signal.aborted) return;

  // 后续文本
  for (const delta of [
    "根据",
    "搜索",
    "结果",
    "，",
    "GenUI",
    " Labs",
    " 是一个",
    "面向生成式",
    " UI 的",
    "实验性工作台",
    "。",
  ]) {
    if (signal.aborted) return;
    yield { kind: "text", delta };
    await sleep(40, signal);
  }
  yield { kind: "control", type: "end" };
};

/**
 * error scenario：发 3 个 chunk 后抛错，验证错误态。
 */
export const errorScenario: MockScript = async function* (_, signal) {
  yield { kind: "control", type: "start" };
  await sleep(150, signal);
  if (signal.aborted) return;

  const preamble = "正常推 3 个 chunk，然后模拟 provider 抛错。\n\n";
  for (let i = 0; i < preamble.length; i += 8) {
    if (signal.aborted) return;
    yield { kind: "text", delta: preamble.slice(i, i + 8) };
    await sleep(40, signal);
  }

  throw new Error("mock scenario: 模拟 provider 错误（已发 3 chunks 后崩溃）");
};

/**
 * reconnect scenario：发 5 个 chunk 后强制关闭流（不发 end），模拟"网络断"。
 * 客户端应该看到 isStreaming 一直为 true（直到用户点停止），用于测试
 * 重连 UI（未来 W4+ 落地）。
 */
export const reconnectScenario: MockScript = async function* (_, signal) {
  yield { kind: "control", type: "start" };
  await sleep(150, signal);
  if (signal.aborted) return;

  for (let i = 0; i < 5; i++) {
    if (signal.aborted) return;
    yield { kind: "text", delta: `chunk ${i + 1}/5 ... ` };
    await sleep(80, signal);
  }
  // 模拟"服务端在未发 end 的情况下切断连接"
  // ReadableStream 自然结束 → parseSseResponse 退出循环
  // 客户端 chunks 不会收到 end，isStreaming 保持 true
  // 客户端需要点"停止"才能清理
};

// ===== helpers =====

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

function pickByKeyword(prompt: string): string {
  if (/react/i.test(prompt)) {
    return [
      "# 这是 Lab 1.1.1 Markdown 流式演示",
      "",
      "这是 **W4-4 升级版**的页面——真正接 SSE + react-markdown 渲染。",
      "",
      "## 它能做什么",
      "",
      "- 边生成边渲染（不等全部内容）",
      "- 自动处理 Markdown 语法（GFM + 代码高亮）",
      "- 支持停止 / 清空 / 切换数据源",
      "",
      "## 代码块示例",
      "",
      "```ts",
      'import { useStreamingStore } from "@/core/state/streaming-store";',
      "```",
      "",
      "> 当前 demo 在 **mock** 模式下走本地 setTimeout；切到 **api** 模式接 `/api/chat` 真 SSE。",
    ].join("\n");
  }
  if (/ag-ui/i.test(prompt)) {
    return "## AG-UI 协议 placeholder\n\nW4-3 会在 `core/protocols/common/` 落地 AG-UI 事件流。\n";
  }
  if (/a2ui/i.test(prompt)) {
    return "## A2UI 协议 placeholder\n\nW4-3 接入 A2UI v0.2 规范。\n";
  }
  if (/json-ui|dsl/i.test(prompt)) {
    return "## JSON-UI DSL placeholder\n\nW6 落地 JSON-UI → React 引擎。\n";
  }
  return [
    "# GenUI Labs · Markdown 流式 demo",
    "",
    `prompt: \`${prompt}\``,
    "",
    "切换到 **api** source 看真 SSE 流式（需在 `.env.local` 配置 provider API Key）。",
  ].join("\n");
}

function longSampleText(): string {
  const paragraphs = [
    "# GenUI Labs 长流式调试样本\n",
    "本样本由 `mock scenario: long` 生成，验证长流稳定性、observability 累计、AbortController 中断。\n\n",
    "## 第一节：项目背景\n\n",
    "GenUI Labs 是一个面向生成式 UI 的实验性工作台，包含 4 个 Lab（Streaming、Codegen、Workbench、Observability）和 1 个 Shared Core。\n",
    "W1 完成脚手架，W2 完成多模型 provider + SSE 通道，W3 完成 react-markdown 渲染 + 真实 provider，W4-4 完成 markdown 页全面升级。\n\n",
    "## 第二节：分层架构\n\n",
    "core/ 共享 7 个模块（protocols / engine / agent / models / eval / components / session），features/ 按 Lab 拆分。\n",
    "Zustand 5 个 store（ui / session / streaming / workbench / observability）按 §9 原则严格分层。\n\n",
    "## 第三节：流式协议\n\n",
    "RenderableEvent 5 种 kind（text / component / state / tool / control），每条 event 一行 SSE data。\n",
    "AG-UI / A2UI / JSON-UI 三种协议共用 RenderableEvent 中间表示，protocol 字段决定 reducer。\n\n",
    "## 第四节：Observability\n\n",
    "首次 token 延迟、总时长、累计 token、工具调用、推理步骤——全部通过 streaming-store 抓 meta chunk 落库。\n",
    "Lab 4 的 dashboard 实时订阅 observability-store，跨组件高频更新（Zustand 唯一合适的位置）。\n\n",
    "## 第五节：可重现性\n\n",
    "脚手架：npx create-next-app@16.2.7 + Tailwind v4 + Biome + shadcn/ui + Vitest。\n",
    "所有依赖用 npm latest；tsconfig strict + noUncheckedIndexedAccess。\n",
    "Turbopack 默认开启，Ready in ~180ms。\n",
  ];
  return paragraphs.join("");
}

/** scenario 注册表（字符串 id → script） */
export const SCENARIOS: Record<MockScenario, MockScript> = {
  default: defaultScenario,
  long: longScenario,
  tools: toolsScenario,
  error: errorScenario,
  reconnect: reconnectScenario,
};

export function getScenario(id: string | undefined | null): MockScenario {
  if (id === "long" || id === "tools" || id === "error" || id === "reconnect") {
    return id;
  }
  return "default";
}
