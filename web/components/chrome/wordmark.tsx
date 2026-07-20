import { C, SANS } from "@/lib/theme";

/* Wordmark — matches the club logo: heavy lowercase grotesque,
   stacked, "ai" carried in the club purple. */
export function Wordmark({ size = 54, color = C.ink }) {
  return (
    <div style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.02, color }}>
      <div style={{ fontSize: size }}>calcutta</div>
      <div style={{ fontSize: size }}>
        <span style={{ color: C.indigo }}>ai</span> club
      </div>
    </div>
  );
}
