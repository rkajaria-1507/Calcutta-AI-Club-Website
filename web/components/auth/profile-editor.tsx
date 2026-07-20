// @ts-nocheck
"use client";

import { useState } from "react";
import { C, MONO, SERIF, SANS } from "@/lib/theme";
import { Eyebrow } from "@/components/chrome/eyebrow";

export function ProfileEditor({ member, onSave, onClose }) {
  const [f, setF] = useState({ ...member });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const input = { width: "100%", padding: "11px 13px", fontFamily: SANS, fontSize: 14, background: C.paper, border: `1px solid ${C.line}`, color: C.ink, outline: "none", marginBottom: 12 };
  const label = { fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", color: C.inkSoft, textTransform: "uppercase", marginBottom: 6 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,22,27,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
      <div style={{ background: C.paperDeep, border: `1px solid ${C.ink}`, maxWidth: 540, width: "100%", padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
        <Eyebrow>Your record</Eyebrow>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 23, color: C.ink, marginBottom: 4 }}>Edit everything that's yours.</div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: C.inkSoft, marginBottom: 18 }}>
          The club wrote a first draft of you. Make it true.
        </div>
        <div style={label}>Your line</div>
        <textarea style={{ ...input, fontFamily: SERIF, fontSize: 15, minHeight: 60, resize: "vertical" }} value={f.line || ""} onChange={set("line")} />
        <div style={label}>Field / world</div>
        <input style={input} value={f.industry || ""} onChange={set("industry")} />
        <div style={label}>What you've built</div>
        <input style={input} value={f.built || ""} onChange={set("built")} />
        <div style={label}>Building toward</div>
        <input style={input} value={f.buildInto || ""} onChange={set("buildInto")} />
        <div style={label}>Taste — what you'd defend forever</div>
        <input style={input} value={f.tasteInto || ""} onChange={set("tasteInto")} />
        <div style={{ ...label, color: C.indigo }}>Dream collaboration</div>
        <input style={{ ...input, borderColor: C.indigo }} value={f.dream || ""} onChange={set("dream")} placeholder="Who or what would you kill to work with?" />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>Need right now</div>
            <input style={input} value={f.ask || ""} onChange={set("ask")} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>Can offer</div>
            <input style={input} value={f.offer || ""} onChange={set("offer")} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button onClick={() => { onSave(f); onClose(); }} style={{ flex: 1, padding: "13px 0", background: C.indigo, color: C.paper, border: "none", fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: "pointer" }}>
            SAVE MY RECORD
          </button>
          <button onClick={onClose} style={{ padding: "13px 18px", background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: "pointer" }}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
