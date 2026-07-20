// @ts-nocheck
import { C, MONO } from "@/lib/theme";

export function Eyebrow({ children, color = C.indigo }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", color, textTransform: "uppercase", marginBottom: 10 }}>
      {children}
    </div>
  );
}
