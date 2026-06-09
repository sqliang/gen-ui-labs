/**
 * /sandbox-iframe/route.ts
 *
 * 沙箱 iframe 页面。接收父窗口 postMessage → eval 执行 → 回传结果。
 * 安全：iframe sandbox="allow-scripts" 隔离。
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
    var root = document.getElementById('root');
    var errorEl = document.getElementById('error');

    window.addEventListener('message', function(event) {
      root.innerHTML = '';
      errorEl.innerHTML = '';

      var data = event.data || {};
      if (!data.code) return;

      try {
        eval(data.code);
        window.parent.postMessage({ id: data.id, type: 'sandbox-result', ok: true, result: 'OK' }, '*');
      } catch (err) {
        var msg = err instanceof Error ? err.message : String(err);
        errorEl.innerHTML = '<div class="err">' + msg.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
        window.parent.postMessage({ id: data.id, type: 'sandbox-result', ok: false, error: msg }, '*');
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
