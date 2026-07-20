// @ts-nocheck
"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { C, MONO, SERIF, SANS } from "@/lib/theme";
import { adaptPitch } from "@/lib/adapters";
import { Eyebrow } from "@/components/chrome/eyebrow";
import { Rule } from "@/components/chrome/rule";
import { PitchSlide } from "@/components/pitches/pitch-slide";

export function PitchBoard({ members, pitches, setPitches, currentUser, me }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", idea: "", ask: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const input = {
    width: "100%", padding: "12px 14px", fontFamily: SANS, fontSize: 14,
    background: C.paper, border: `1px solid ${C.line}`, color: C.ink, outline: "none", marginBottom: 12,
  };
  const label = { fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", color: C.inkSoft, textTransform: "uppercase", marginBottom: 6 };

  const post = async () => {
    if (!f.title.trim() || !f.idea.trim() || !me) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api("/pitches", {
        method: "POST",
        auth: true,
        body: { title: f.title.trim(), idea: f.idea.trim(), ask: f.ask.trim() || null },
      });
      setPitches([adaptPitch(created), ...pitches]);
      setF({ title: "", idea: "", ask: "" });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't post that — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ padding: "56px 0 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <Eyebrow color={C.indigo}>Ideas seeking hands</Eyebrow>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, letterSpacing: "-0.035em", lineHeight: 1.02, color: C.ink }}>
            pitch <span style={{ color: C.indigo }}>board</span>
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.inkSoft, marginTop: 14, maxWidth: 520, lineHeight: 1.6 }}>
            Three fields. The board renders your slide, and the club suggests who should hear it first.
          </div>
        </div>
        <button
          onClick={() => me ? setOpen(true) : null}
          title={me ? "" : "Sign in to post"}
          style={{ border: "none", padding: "14px 24px", background: me ? C.ink : C.inkSoft, color: C.paper, fontFamily: MONO, fontSize: 12, letterSpacing: "0.22em", cursor: me ? "pointer" : "not-allowed", opacity: me ? 1 : 0.7 }}
        >
          {me ? "POST A PITCH →" : "SIGN IN TO POST"}
        </button>
      </div>

      <Rule />

      {/* Dream collabs — the room's collective ambition, and the sponsorship seam */}
      <div style={{ marginBottom: 34 }}>
        <Eyebrow color={C.indigo}>Where the room's ambition points</Eyebrow>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: C.ink, marginBottom: 4 }}>
          Dream collaborations
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: C.inkSoft, marginBottom: 16, maxWidth: 560, lineHeight: 1.55 }}>
          Who the club would kill to build with. A map of the room's ceiling, and the first thing a sponsor should see.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {members.filter((m) => m.dream).map((m) => (
            <div key={m.id} style={{ border: `1px solid ${C.line}`, padding: "12px 15px", background: C.paper }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13, color: C.ink }}>{m.name}</div>
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: C.indigo, lineHeight: 1.4, marginTop: 3 }}>{m.dream}</div>
            </div>
          ))}
        </div>
      </div>

      <Rule />
      <Eyebrow color={C.indigo}>Live pitches</Eyebrow>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: C.ink, marginBottom: 18 }}>
        Ideas on the table
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18 }}>
        {pitches.map((p) => <PitchSlide key={p.id} p={p} me={me} />)}
      </div>

      {open && me && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(23,22,27,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div style={{ background: C.paperDeep, border: `1px solid ${C.ink}`, maxWidth: 520, width: "100%", padding: 28 }}>
            <Eyebrow color={C.indigo}>New pitch · {me.name}</Eyebrow>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 24, color: C.ink, marginBottom: 18 }}>Say it in three fields.</div>
            <div style={label}>Title</div>
            <input style={input} value={f.title} onChange={set("title")} placeholder="Name the idea" />
            <div style={label}>The idea</div>
            <textarea style={{ ...input, minHeight: 90, resize: "vertical" }} value={f.idea} onChange={set("idea")} placeholder="Two or three sentences. The board makes it look good." />
            <div style={label}>The ask</div>
            <input style={input} value={f.ask} onChange={set("ask")} placeholder="What do you need from the room?" />
            {error && (
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: C.stamp, marginBottom: 10 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button onClick={post} disabled={busy} style={{ flex: 1, padding: "13px 0", background: busy ? C.inkSoft : C.indigo, color: "#fff", border: "none", fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: "pointer" }}>
                {busy ? "MATCHING THE ROOM..." : "POST TO THE BOARD"}
              </button>
              <button onClick={() => setOpen(false)} style={{ padding: "13px 18px", background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: "pointer" }}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
