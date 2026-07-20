// @ts-nocheck
import { C, MONO, SANS } from "@/lib/theme";

export function DossierRow({ label, value, italic }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.16em", color: C.inkSoft, textTransform: "uppercase", width: 62, flexShrink: 0, paddingTop: 1 }}>{label}</div>
      <div style={{ fontFamily: SANS, fontSize: 13.5, color: C.ink, lineHeight: 1.45, fontStyle: italic ? "italic" : "normal" }}>{value}</div>
    </div>
  );
}
