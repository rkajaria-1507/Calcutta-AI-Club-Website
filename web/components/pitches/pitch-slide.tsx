// @ts-nocheck
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { C, MONO, SERIF, SANS } from "@/lib/theme";

export function PitchSlide({ p, me }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(null);
  const [count, setCount] = useState(p.commentCount);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const opening = !showComments;
    setShowComments(opening);
    if (opening && comments === null) {
      try {
        const rows = await api(`/pitches/${p.id}/comments`);
        setComments(rows.map((c) => ({ id: c.id, author: c.author.name, text: c.body })));
      } catch {
        setComments([]);
      }
    }
  };

  const submit = async () => {
    if (!draft.trim() || !me) return;
    setBusy(true);
    try {
      const c = await api(`/pitches/${p.id}/comments`, {
        method: "POST",
        auth: true,
        body: { body: draft.trim() },
      });
      setComments([...(comments || []), { id: c.id, author: c.author.name, text: c.body }]);
      setCount(count + 1);
      setDraft("");
    } catch {
      // keep the draft so the member can retry
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ border: `1px solid ${C.ink}`, background: C.paper, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "26px 28px 20px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.24em", color: C.inkSoft, marginBottom: 10 }}>
          PITCH · {p.author.toUpperCase()}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", color: C.ink, lineHeight: 1.1 }}>
          {p.title}
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 15.5, color: C.ink, lineHeight: 1.65, marginTop: 14 }}>
          {p.idea}
        </div>
      </div>
      <div style={{ padding: "16px 28px", background: C.indigo }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.26em", color: "rgba(255,255,255,0.72)" }}>THE ASK</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 17, color: "#fff", marginTop: 3 }}>{p.ask}</div>
      </div>
      <div style={{ padding: "16px 28px", background: C.paperDeep, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.26em", color: C.indigo, marginBottom: 10 }}>THE CLUB SUGGESTS</div>
        {p.suggested.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 7 }}>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 14, color: C.ink, whiteSpace: "nowrap" }}>{s.name}</span>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: C.inkSoft, lineHeight: 1.5 }}>{s.reason}</span>
          </div>
        ))}
      </div>

      {/* Comments — collapsed by default, so the board stays a clean wall of slides */}
      <div style={{ padding: "12px 28px 16px" }}>
        <button
          onClick={toggle}
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: C.inkSoft, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
        >
          {count ? `${count} REPLY${count > 1 ? "S" : ""}` : "DISCUSS"} {showComments ? "▾" : "▸"}
        </button>

        {showComments && (
          <div style={{ marginTop: 12 }}>
            {(comments || []).map((c) => (
              <div key={c.id} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: `2px solid ${C.line}` }}>
                <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 12.5, color: C.ink }}>{c.author}</span>
                <span style={{ fontFamily: SERIF, fontSize: 13.5, color: C.ink, lineHeight: 1.5, marginLeft: 8 }}>{c.text}</span>
              </div>
            ))}
            {comments !== null && comments.length === 0 && (
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>
                No replies yet. Start the thread.
              </div>
            )}
            {me ? (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
                  placeholder={`Reply as ${me.name.split(" ")[0]}…`}
                  style={{ flex: 1, fontFamily: SERIF, fontSize: 14, color: C.ink, background: "transparent", border: "none", borderBottom: `1px solid ${C.line}`, padding: "6px 2px", outline: "none" }}
                />
                <button onClick={submit} disabled={busy} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", padding: "0 14px", background: C.indigo, color: C.paper, border: "none", cursor: "pointer" }}>
                  {busy ? "…" : "SEND"}
                </button>
              </div>
            ) : (
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: C.inkSoft, marginTop: 4 }}>
                SIGN IN TO REPLY
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
