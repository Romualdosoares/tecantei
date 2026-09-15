import { ImageResponse } from "next/og";

export const alt = "Te Cantei — Sua história virou música";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#050505", color: "#FFFDF8", padding: "76px 86px", fontFamily: "Georgia, serif" }}>
      <div style={{ position: "absolute", inset: 24, border: "2px solid #B77A1F", borderRadius: 34 }} />
      <div style={{ position: "absolute", width: 520, height: 520, right: -110, top: -170, border: "80px solid rgba(240,189,79,.16)", borderRadius: 999 }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, color: "#FFE49A", fontSize: 34, fontWeight: 700 }}>
          <div style={{ display: "flex", width: 58, height: 58, alignItems: "center", justifyContent: "center", border: "2px solid #F0BD4F", borderRadius: 18 }}>♪</div>
          Te Cantei
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
          <div style={{ color: "#F0BD4F", fontFamily: "Arial, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>Sua história virou música</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 22, fontSize: 78, fontWeight: 700, lineHeight: 1.06 }}><span>O momento passa.</span><span>A canção fica.</span></div>
          <div style={{ marginTop: 28, color: "#D6C8AE", fontFamily: "Arial, sans-serif", fontSize: 28 }}>Uma música personalizada para presentear quem você ama.</div>
        </div>
      </div>
    </div>,
    size,
  );
}
