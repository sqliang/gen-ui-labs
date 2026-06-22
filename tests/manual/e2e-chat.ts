/**
 * 真 e2e 测试（curl 风格）—— 跑 `/api/chat` 验证 SSE 流 + Zod 验证。
 *
 * 用法（需 dev server 在 :3000）：
 *   curl http://localhost:3000/api/health  # 先确认 server alive
 *   tsx tests/manual/e2e-chat.ts
 *
 * 这不是 vitest 测试 —— 它是手动 / CI 跑的 e2e。退出码：
 *   0 = 所有 assertion pass
 *   1 = 至少一条 fail
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

interface Assertion {
  name: string;
  pass: boolean;
  detail: string;
}

const results: Assertion[] = [];

function assert(name: string, cond: boolean, detail = ""): void {
  results.push({ name, pass: cond, detail });
  const tag = cond ? "✓" : "✗";
  console.log(`  ${tag} ${name}${detail ? ` — ${detail}` : ""}`);
}

function failFast(msg: string): never {
  console.error(`\nFATAL: ${msg}`);
  process.exit(1);
}

async function fetchSse(
  body: unknown,
  debug = true,
): Promise<{ status: number; events: unknown[] }> {
  const url = `${BASE}/api/chat${debug ? "?debug=1&scenario=long" : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { status: res.status, events: [] };
  }
  if (!res.body) return { status: res.status, events: [] };

  const events: unknown[] = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  // 读 5 秒就够（mock scenario 长 ~3s）
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // 切 SSE 行
    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";
    for (const block of lines) {
      for (const line of block.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            events.push(JSON.parse(line.slice(6)));
          } catch {
            // ignore malformed line
          }
        }
      }
    }
    if (events.length > 0 && events.length >= 8) break; // mock 长 scenario 大约 8-10 events
  }
  return { status: res.status, events };
}

async function main(): Promise<void> {
  console.log(`\n=== /api/chat e2e (BASE=${BASE}) ===\n`);

  // 0. health check
  try {
    const h = await fetch(`${BASE}/api/health`);
    assert("server alive", h.ok, `status=${h.status}`);
    if (!h.ok) failFast("server not ready");
  } catch (e) {
    failFast(`server unreachable: ${(e as Error).message}`);
  }

  // 1. happy path — mock SSE stream
  console.log("\n[1] mock SSE stream (scenario=long)");
  const { status, events } = await fetchSse({
    model: "deepseek-chat",
    messages: [{ role: "user", content: "你好" }],
  });
  assert("200 OK", status === 200, `status=${status}`);
  assert("≥3 SSE events", events.length >= 3, `got ${events.length}`);
  const first = events[0] as { type?: string } | undefined;
  assert("first event has type", typeof first?.type === "string", `type=${first?.type}`);

  // 2. Zod validation — missing model → 400
  console.log("\n[2] Zod validation: missing model");
  const res2 = await fetch(`${BASE}/api/chat?debug=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
  });
  assert("400 Bad Request", res2.status === 400, `status=${res2.status}`);
  const body2 = await res2.text();
  assert("error mentions model", body2.includes("model"), `body=${body2.slice(0, 80)}`);

  // 3. Zod validation — empty messages → 400
  console.log("\n[3] Zod validation: empty messages");
  const res3 = await fetch(`${BASE}/api/chat?debug=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "deepseek-chat", messages: [] }),
  });
  assert("400 Bad Request", res3.status === 400, `status=${res3.status}`);

  // 4. /api/health shape
  console.log("\n[4] /api/health shape");
  const h = await fetch(`${BASE}/api/health`).then((r) => r.json());
  assert("has ok", h.ok === true, `ok=${h.ok}`);
  assert("has labs count", typeof h.labs === "number" && h.labs > 0, `labs=${h.labs}`);
  assert("has version", typeof h.version === "string", `v=${h.version}`);

  // 5. /api/keys redacted
  console.log("\n[5] /api/keys redacts real keys");
  const keys = await fetch(`${BASE}/api/keys`).then((r) => r.json());
  const json = JSON.stringify(keys);
  assert(
    "no real API key leaked",
    !json.includes("sk-ant-") &&
      !json.includes("sk-proj-") &&
      !json.includes("AIzaSy") &&
      !json.match(/sk-[A-Za-z0-9]{32,}/),
    `len=${json.length}`,
  );

  // 6. /api/chat deepseek (real provider — skipped if no key)
  console.log("\n[6] /api/chat deepseek real (skipped if no key)");
  const dsKey = (keys.providers as Array<{ provider: string; configured: boolean }>).find(
    (p) => p.provider === "deepseek",
  )?.configured;
  if (!dsKey) {
    console.log("  ⊘ skip — DEEPSEEK_API_KEY not configured in .env.local");
  } else {
    const { status: dsStatus, events: dsEvents } = await fetchSse(
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: "说一句话证明你在线" }],
      },
      false, // real provider, not debug
    );
    assert("200 OK", dsStatus === 200, `status=${dsStatus}`);
    const text = (dsEvents as { kind?: string; delta?: string }[])
      .filter((e) => e.kind === "text")
      .map((e) => e.delta)
      .join("");
    assert("got text delta", text.length > 0, `len=${text.length} sample="${text.slice(0, 40)}"`);
  }

  // summary
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(
    `\n=== ${passed}/${results.length} passed${failed > 0 ? `, ${failed} FAILED` : ""} ===`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
