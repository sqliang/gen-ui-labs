import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// 4 个方块 logo —— 与全站 site-header 的 SVG 一致
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexWrap: "wrap",
        background: "#0a0a0a",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 14,
          height: 14,
          background: "#fafafa",
          opacity: 0.95,
        }}
      />
      <div
        style={{
          display: "flex",
          width: 14,
          height: 14,
          background: "#fafafa",
          opacity: 0.35,
        }}
      />
      <div
        style={{
          display: "flex",
          width: 14,
          height: 14,
          background: "#fafafa",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          display: "flex",
          width: 14,
          height: 14,
          background: "#fafafa",
          opacity: 1,
        }}
      />
    </div>,
    { ...size },
  );
}
