// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { C, MONO, SERIF } from "@/lib/theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { FlapLine } from "@/components/flap/flap-line";
import { formatSessionWhen } from "@/components/sessions/session-card";

export function RoomTonight({ members }) {
  // Live check-ins (QR scan → this wall, polling GET /sessions/{id}/checkins)
  // are ROADMAP.md Phase 7 — deliberately not built yet, so this reads
  // honestly empty rather than replaying scripted fake names.
  const [checked] = useState([]);
  const [session, setSession] = useState(undefined); // undefined = loading, null = none scheduled
  const reduced = useReducedMotion();

  useEffect(() => {
    (async () => {
      try {
        const all = await api("/sessions");
        const upcoming = all.filter((s) => new Date(s.starts_at) >= new Date());
        setSession(upcoming[0] || null);
      } catch {
        setSession(null);
      }
    })();
  }, []);

  const byName = Object.fromEntries(members.map((m) => [m.name, m]));

  const banner = session
    ? `LIVE · ${formatSessionWhen(session.starts_at).toUpperCase()}${session.venue ? ` · ${session.venue.toUpperCase()}` : ""}`
    : session === null
    ? "NO SESSION SCHEDULED YET"
    : "LOADING…";

  return (
    <div style={{ background: C.dark, margin: "0 -24px", padding: "56px 24px 80px", minHeight: "80vh" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.3em", color: C.indigoGlow, marginBottom: 12 }}>
              {banner}
            </div>
            <FlapLine text="THE ROOM TONIGHT" size={40} dark />
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "rgba(237,234,224,0.55)", marginTop: 16 }}>
              Scan in. Your name lands on the wall. The room reads itself filling up.
            </div>
          </div>
          <div style={{ border: `1px solid ${C.indigoGlow}`, padding: 18, textAlign: "center" }}>
            <div style={{ width: 108, height: 108, background: `repeating-conic-gradient(${C.warmWhite} 0% 25%, ${C.dark} 0% 50%)`, backgroundSize: "18px 18px", margin: "0 auto" }} />
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.24em", color: C.indigoGlow, marginTop: 12 }}>SCAN TO CHECK IN</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 16, margin: "40px 0 24px" }}>
          <div style={{ fontFamily: MONO, fontSize: 64, fontWeight: 700, color: C.warmWhite, lineHeight: 1 }}>
            {String(checked.length).padStart(2, "0")}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.26em", color: "rgba(237,234,224,0.5)" }}>
            IN THE ROOM
          </div>
        </div>

        <div style={{ borderTop: `1px solid rgba(133,131,240,0.25)` }}>
          {checked.map((c, i) => {
            const m = byName[c.name];
            return (
              <div key={c.t} style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "16px 0", borderBottom: `1px solid rgba(133,131,240,0.12)`, flexWrap: "wrap" }}>
                {i === 0 && !reduced
                  ? <FlapLine text={c.name} size={22} dark stagger={30} />
                  : <span style={{ fontFamily: MONO, fontSize: 22, color: C.warmWhite, letterSpacing: "0.02em" }}>{c.name.toUpperCase()}</span>}
                {m && (
                  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: C.indigoGlow }}>
                    “{m.epithet}”{m.ask ? ` · needs ${m.ask.toLowerCase()}` : ""}
                  </span>
                )}
              </div>
            );
          })}
          {checked.length === 0 && (
            <div style={{ fontFamily: MONO, fontSize: 13, color: "rgba(237,234,224,0.4)", padding: "24px 0", letterSpacing: "0.1em" }}>
              WAITING FOR THE FIRST SCAN...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
