/**
 * /sandbox-iframe/route.ts
 *
 * 沙箱 iframe 页面。在 sandbox="allow-scripts" 模式下运行，
 * 接收父窗口 postMessage → 执行 → 回传结果。
 *
 * W7 落地。安全措施：
 * - sandbox="allow-scripts" — 禁止 navigation / form / popup
 * - 只执行通过 postMessage 传来的代码
 * - 回传结果走 JSON.stringify（不能传函数）
 */

export const dynamic = "force-dynamic";

export function GET(): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 1rem; font-family: system-ui; background: #0a0a0a; color: #e5e5e5; }
    .err { color: #ef4444; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error"></div>
  <script>
    const root = document.getElementById('root');
    const errorEl = document.getElementById('error');

    window.addEventListener('message', (event) => {
      // 只接受特定 origin（开发时允许所有，生产时收紧）
      if (event.origin !== window.location.origin && event.origin !== 'http://localhost:3000') return;

      const { id, code } = event.data ?? {};
      if (!code) return;

      // 清空上次输出
      root.innerHTML = '';
      errorEl.innerHTML = '';

      try {
        // 在沙箱内执行代码
        const result = eval(code);
        if (result !== undefined) {
          root.innerHTML = '<pre style="font-size:12px;white-space:pre-wrap">' + String(result) + '</pre>';
        }
        window.parent.postMessage({ id, type: 'sandbox-result', ok: true, result: String(result ?? '') }, '*');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errorEl.innerHTML = '<div class="err">' + msg.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
        window.parent.postMessage({ id, type: 'sandbox-result', ok: false, error: msg }, '*');
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy":
        "sandbox allow-scripts; default-src 'unsafe-inline' 'unsafe-eval';",
    },
  });
}
