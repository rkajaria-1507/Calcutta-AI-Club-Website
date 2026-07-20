// @ts-nocheck
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { C, MONO, SERIF } from "@/lib/theme";

export async function askCorpus(question, members) {
  try {
    const res = await api("/corpus/ask", { method: "POST", body: { question }, auth: true });
    return res.answer;
  } catch (e) {
    // The backend already degrades to a keyword fallback when unset — this
    // only fires if the backend itself is unreachable.
    const q = question.toLowerCase();
    const hits = members.filter((m) =>
      [m.industry, m.built, m.buildInto, m.tasteInto, m.offer, ...(m.tags || [])]
        .join(" ").toLowerCase().split(/[^a-z#]+/).some((w) => w.length > 3 && q.includes(w))
    );
    if (!hits.length) return "Nobody on the wall matches that yet. Try a broader phrasing, or a tag.";
    return `Looks like ${hits.slice(0, 3).map((m) => m.name).join(", ")} — ${hits[0].line}`;
  }
}

export const SAMPLE_QUESTIONS = [
  "who's into lovable?",
  "who should I meet if I'm building agents?",
  "whose taste runs melancholic?",
  "who can teach me RAG?",
];

export function CorpusBar({ members }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);

  const ask = async (text) => {
    const question = (text ?? q).trim();
    if (!question) return;
    setBusy(true);
    setAnswer(null);
    const a = await askCorpus(question, members);
    setAnswer({ q: question, a });
    setBusy(false);
  };

  return (
    <div style={{ borderRadius: 18, background: C.inkGlass, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", padding: "24px 26px", marginBottom: 28, boxShadow: "0 12px 40px rgba(12,12,19,0.28)" }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.24em", color: C.indigoGlow, marginBottom: 12 }}>
        ASK THE ROOM
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask anything about the members…"
          style={{ flex: 1, fontFamily: SERIF, fontSize: 17, color: C.warmWhite, background: "transparent", border: "none", borderBottom: "1px solid rgba(240,237,230,0.22)", padding: "8px 2px", outline: "none" }}
        />
        <button
          onClick={() => ask()}
          disabled={busy}
          style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", padding: "0 20px", borderRadius: 10, background: busy ? "rgba(240,237,230,0.15)" : C.indigo, color: C.warmWhite, border: "none", cursor: "pointer" }}
        >
          {busy ? "READING…" : "ASK"}
        </button>
      </div>

      {!answer && !busy && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {SAMPLE_QUESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setQ(s); ask(s); }}
              style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: "rgba(240,237,230,0.6)", background: "transparent", border: "1px solid rgba(240,237,230,0.2)", borderRadius: 20, padding: "5px 14px", cursor: "pointer" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {busy && (
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.14em", color: "rgba(240,237,230,0.5)", marginTop: 16 }}>
          READING THE CORPUS…
        </div>
      )}

      {answer && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(240,237,230,0.15)" }}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: C.indigoGlow, marginBottom: 8 }}>
            “{answer.q}”
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 16.5, lineHeight: 1.6, color: C.warmWhite }}>
            {answer.a}
          </div>
          <button
            onClick={() => { setAnswer(null); setQ(""); }}
            style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", marginTop: 12, padding: "4px 10px", borderRadius: 8, background: "transparent", color: "rgba(240,237,230,0.6)", border: "1px solid rgba(240,237,230,0.25)", cursor: "pointer" }}
          >
            ASK ANOTHER
          </button>
        </div>
      )}
    </div>
  );
}
