import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { CommandPalette } from "@/components/command-palette";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "GenUI Labs · 协议驱动的生成式 UI 实验室",
    template: "%s · GenUI Labs",
  },
  description:
    "实验性工作台：UI 协议流式渲染 · LLM 生成 UI 代码/DSL · 渲染引擎调试 · Agent 可观测性。4 个 Lab 并列，1 个共享内核。",
  keywords: [
    "GenUI",
    "Generative UI",
    "Streaming Protocol",
    "AG-UI",
    "A2UI",
    "JSON-UI",
    "LLM",
    "Agent",
    "Next.js 16",
    "React 19",
  ],
  authors: [{ name: "sqliang" }],
  openGraph: {
    title: "GenUI Labs · 协议驱动的生成式 UI 实验室",
    description: "把 LLM / Agent 的输出打开来看：流式协议、UI 代码生成、引擎调试、推理可观测。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary",
    title: "GenUI Labs",
    description: "协议驱动的生成式 UI 实验室",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
      <body className="bg-background text-foreground min-h-full">
        <ThemeApplier />
        {/* 全站顶栏；侧栏只在 /labs/* 下由 labs/layout.tsx 渲染 */}
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <div className="min-w-0 flex-1">{children}</div>
          <SiteFooter />
        </div>
        <CommandPalette />
      </body>
    </html>
  );
}
