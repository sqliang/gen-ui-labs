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
      <body className="bg-background text-foreground min-h-full flex flex-col">
        <ThemeApplier />
        {children}
      </body>
    </html>
  );
}
