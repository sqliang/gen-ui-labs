// Re-export the home OG image for Twitter (which falls
// back to opengraph-image if twitter-image is missing,
// but explicit copy lets us tweak later).
import { ImageResponse } from "next/og";

export const alt = "GenUI Labs · Generative UI Lab";
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
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#fafafa",
        padding: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 110,
          fontWeight: 700,
          lineHeight: 1.0,
          color: "#fafafa",
          marginBottom: 30,
        }}
      >
        Generative UI Lab
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 38,
          color: "#a3a3a3",
          marginBottom: 60,
        }}
      >
        Protocol-driven streaming · LLM code gen · Engine debug
      </div>
      <div
        style={{
          display: "flex",
          gap: 18,
        }}
      >
        <Pill number="01" label="Streaming" color="#60a5fa" />
        <Pill number="02" label="Codegen" color="#c084fc" />
        <Pill number="03" label="Workbench" color="#fbbf24" />
        <Pill number="04" label="Observability" color="#4ade80" />
      </div>
    </div>,
    { ...size },
  );
}

function Pill({ number, label, color }: { number: string; label: string; color: string }) {
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
