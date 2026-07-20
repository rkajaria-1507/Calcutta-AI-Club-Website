// @ts-nocheck
import { C, MONO, SERIF, SANS } from "@/lib/theme";
import { Eyebrow } from "@/components/chrome/eyebrow";

export function LoginModal({ onNew, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,22,27,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
      <div style={{ background: C.paperDeep, border: `1px solid ${C.ink}`, maxWidth: 460, width: "100%", padding: 28 }}>
        <Eyebrow>Sign in</Eyebrow>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 23, color: C.ink, marginBottom: 6 }}>New here?</div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: C.inkSoft, marginBottom: 18 }}>
          Join the wall in a minute. If you've already joined on this device, you're signed in
          automatically — real phone sign-in for other devices is coming.
        </div>
        <button
          onClick={() => { onNew(); onClose(); }}
          style={{ width: "100%", textAlign: "left", fontFamily: MONO, fontSize: 12, letterSpacing: "0.14em", color: C.paper, background: C.indigo, border: "none", padding: "13px 15px", cursor: "pointer", marginBottom: 14 }}
        >
          + I'M NEW — JOIN THE WALL
        </button>
        <button onClick={onClose} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", padding: "10px 16px", background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, cursor: "pointer", width: "100%" }}>
          CANCEL
        </button>
      </div>
    </div>
  );
}
