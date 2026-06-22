import { ImageResponse } from "next/og";

export const alt = "GenUI Labs · 协议驱动的生成式 UI 实验室";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const fetchCache = "force-no-store";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0a",
        color: "#fafafa",
        padding: 80,
      }}
    >
      {/* 顶部 brand row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 28,
          color: "#a1a1a1",
          marginBottom: 70,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 14,
            height: 14,
            borderRadius: 7,
            background: "#10b981",
          }}
        />
        <span style={{ fontWeight: 600, color: "#e5e5e5" }}>GenUI Labs</span>
        <span style={{ color: "#525252" }}>·</span>
        <span>v0.1.0-w5</span>
      </div>

      {/* 主标题（英文 + emoji） */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxWidth: 1000,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 100,
            fontWeight: 700,
            lineHeight: 1.0,
            color: "#fafafa",
          }}
        >
          Generative UI Lab
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 40,
            lineHeight: 1.3,
            color: "#a3a3a3",
            marginTop: 18,
          }}
        >
          Protocol-driven streaming · LLM code gen · Engine debug
        </div>
      </div>

      {/* 底部 4 Lab pills */}
      <div
        style={{
          display: "flex",
          gap: 18,
          marginTop: "auto",
        }}
      >
        <LabPill number="01" label="Streaming" color="#60a5fa" />
        <LabPill number="02" label="Codegen" color="#c084fc" />
        <LabPill number="03" label="Workbench" color="#fbbf24" />
        <LabPill number="04" label="Observability" color="#4ade80" />
      </div>

      {/* 底部 URL */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: 36,
          right: 80,
          fontSize: 24,
          color: "#737373",
        }}
      >
        genui-labs.dev
      </div>
    </div>,
    { ...size },
  );
}

function LabPill({ number, label, color }: { number: string; label: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 22px",
        borderRadius: 999,
        border: `2px solid ${color}`,
        color: "#fafafa",
        fontSize: 28,
      }}
    >
      <span style={{ color, fontWeight: 700 }}>{number}</span>
      <span style={{ color: "#525252" }}>·</span>
      <span>{label}</span>
    </div>
  );
}
