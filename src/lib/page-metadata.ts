import type { Metadata } from "next";

/**
 * Helper: per-page metadata factory for Lab sub-pages.
 * Title 自动套 `template: "%s · GenUI Labs"`（来自 root layout）。
 *
 * @param title       sub-page 标题（如 "Markdown 流式渲染"）
 * @param description 一句话说明
 * @param accent      oklch accent 颜色（lab 区分）
 */
export function labMetadata(title: string, description: string, accent?: string): Metadata {
  return {
    title,
    description,
    ...(accent ? { openGraph: { title, description } } : {}),
    other: accent ? { "theme-color": accent } : {},
  };
}
