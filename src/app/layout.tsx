import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeApplier } from "@/components/theme-applier";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GenUI Labs",
  description:
    "实验性工作台：UI 协议流式渲染 · LLM 生成 UI 代码/DSL · 渲染引擎调试 · Agent 可观测性",
};

/**
 * 防 dark mode 闪烁：在 hydration 之前读 localStorage / 系统偏好，
 * 给 <html> 加上 .dark class。这是 shadcn/ui 标准做法。
 */
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('gen-ui-labs.ui');
    var mode = 'system';
    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed && parsed.state && parsed.state.themeMode) {
        mode = parsed.state.themeMode;
      }
    }
    var isDark = mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: must execute before hydration to prevent FOUC
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="bg-background text-foreground min-h-full flex flex-col">
        <ThemeApplier />
        {children}
      </body>
    </html>
  );
}
