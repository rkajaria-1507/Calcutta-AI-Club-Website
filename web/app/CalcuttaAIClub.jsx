"use client";

import React, { useState, useEffect, useRef } from "react";
import { api, getToken, setToken, ApiError } from "@/lib/api";

/* Adapts the backend's field names (field/build_into/taste) to the ones
   this component was originally written against (industry/buildInto/tasteInto). */
function adaptMember(m) {
  return {
    ...m,
    industry: m.field,
    buildInto: m.build_into,
    tasteInto: m.taste,
  };
}

function adaptPitch(p) {
  return {
    id: p.id,
    author: p.author.name,
    authorId: p.author.id,
    title: p.title,
    idea: p.idea,
    ask: p.ask,
    suggested: p.suggested,
    commentCount: p.comment_count,
  };
}

/* ============================================================
   CALCUTTA AI CLUB — club software
   Three surfaces, one corpus:
   1. The Club  — front page + living directory + corpus chatbot
   2. Pitch Board — post an idea, get matched people, discuss
   3. Room Tonight — dark projector mode, live check-ins
   Visual identity: Howrah split-flap departure board.
   Paper + ink + club indigo; stamp red reserved for THE ASK.

   AI calls (profile generation, pitch matching, corpus Q&A) go
   through server routes under /api/* so the key stays server-side.
   Every call degrades to deterministic local logic on failure.
   ============================================================ */

const C = {
  paper: "#F4F0E6",
  paperDeep: "#ECE6D6",
  ink: "#17161B",
  inkSoft: "#4A4850",
  indigo: "#6C69D6",
  indigoGlow: "#9C9AF5",
  stamp: "#C8402A",
  dark: "#0C0C13",
  darkPanel: "#14141E",
  warmWhite: "#EDEAE0",
  line: "#C9C2AF",
  inkGlass: "rgba(12,12,19,0.92)",
};

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/* ------------------------ seed corpus ------------------------ */

/* ------------------- split-flap primitives ------------------- */

const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .·";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, []);
  return reduced;
}

function FlapChar({ target, delay, dark }) {
  const reduced = useReducedMotion();
  const [ch, setCh] = useState(" ");
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (reduced) { setCh(target); setSettled(true); return; }
    let cancelled = false;
    let step = 0;
    const spins = 4 + Math.floor(Math.random() * 4);
    const timer = setTimeout(function spin() {
      if (cancelled) return;
      if (step < spins) {
        setCh(FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]);
        step++;
        setTimeout(spin, 45);
      } else {
        setCh(target);
        setSettled(true);
      }
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [target, delay, reduced]);
  return (
    <span
      style={{
        display: "inline-block",
        width: "1.15ch",
        textAlign: "center",
        fontFamily: MONO,
        background: dark ? C.darkPanel : C.ink,
        color: settled ? (dark ? C.warmWhite : C.paper) : (dark ? C.indigoGlow : C.paperDeep),
        borderRadius: 2,
        margin: "0 1px",
        boxShadow: dark ? "inset 0 -1px 0 rgba(133,131,240,0.25)" : "inset 0 -2px 0 rgba(0,0,0,0.45)",
        transition: "color 120ms",
      }}
    >
      {ch === " " ? " " : ch}
    </span>
  );
}

function FlapLine({ text, size = 28, dark = false, stagger = 22 }) {
  return (
    <div style={{ fontSize: size, lineHeight: 1.25, letterSpacing: "0.02em", whiteSpace: "nowrap" }} aria-label={text}>
      {text.toUpperCase().split("").map((c, i) => (
        <FlapChar key={i + "-" + c} target={c} delay={i * stagger} dark={dark} />
      ))}
    </div>
  );
}

/* --------------------------- chrome -------------------------- */

function Eyebrow({ children, color = C.indigo }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", color, textTransform: "uppercase", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Rule() {
  return <div style={{ height: 1, background: C.line, margin: "28px 0" }} />;
}

/* Wordmark — matches the club logo: heavy lowercase grotesque,
   stacked, "ai" carried in the club purple. */
function Wordmark({ size = 54, color = C.ink }) {
  return (
    <div style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.02, color }}>
      <div style={{ fontSize: size }}>calcutta</div>
      <div style={{ fontSize: size }}>
        <span style={{ color: C.indigo }}>ai</span> club
      </div>
    </div>
  );
}

/* ----------------------- member card ------------------------ */

function MemberCard({ m, onUpdateLine, onTagClick, activeTags, isMe, onEditProfile }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.line || "");
  const save = () => { onUpdateLine(m.id, draft.trim() || m.line); setEditing(false); };
  const initials = m.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div style={{ border: `1px solid ${isMe ? C.indigo : C.line}`, background: C.paper, display: "flex", flexDirection: "column" }}>
      {/* Header band: monogram + name + epithet, on deep paper */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "20px 24px", background: C.paperDeep, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ width: 46, height: 46, flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${C.indigo}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 16, color: C.indigo, letterSpacing: "-0.02em" }}>
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 20, letterSpacing: "-0.015em", color: C.ink, lineHeight: 1.1 }}>{m.name}</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: C.indigo, marginTop: 3 }}>“{m.epithet}”</div>
        </div>
        {isMe && (
          <button
            onClick={onEditProfile}
            style={{ flexShrink: 0, fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", padding: "5px 9px", background: C.indigo, color: C.paper, border: "none", cursor: "pointer" }}
          >
            EDIT
          </button>
        )}
      </div>

      <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* The line — the lede. Editable inline only by the owner. */}
        {editing && isMe ? (
          <div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{ width: "100%", fontFamily: SERIF, fontSize: 16, lineHeight: 1.5, color: C.ink, background: C.paperDeep, border: `1px solid ${C.indigo}`, padding: "10px 12px", resize: "vertical", minHeight: 64, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={save} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", padding: "6px 12px", background: C.indigo, color: C.paper, border: "none", cursor: "pointer" }}>SAVE</button>
              <button onClick={() => { setDraft(m.line); setEditing(false); }} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", padding: "6px 12px", background: "transparent", color: C.ink, border: `1px solid ${C.line}`, cursor: "pointer" }}>CANCEL</button>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: SERIF, fontSize: 16.5, lineHeight: 1.5, color: C.ink, position: "relative" }}>
            {m.line}
            {isMe && (
              <button
                onClick={() => { setDraft(m.line); setEditing(true); }}
                title="Edit your line"
                style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.14em", marginLeft: 8, padding: "2px 6px", background: "transparent", color: C.indigo, border: `1px solid ${C.indigo}`, cursor: "pointer", verticalAlign: "middle" }}
              >
                EDIT
              </button>
            )}
          </div>
        )}

        {/* Dossier rows: labelled, aligned, quiet */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <DossierRow label="Field" value={m.industry} />
          <DossierRow label="Built" value={m.built} />
          <DossierRow label="Building" value={m.buildInto} />
          <DossierRow label="Taste" value={m.tasteInto} italic />
        </div>

        {/* Needs / offers — the transactional pair */}
        <div style={{ display: "flex", gap: 0, border: `1px solid ${C.line}` }}>
          <div style={{ flex: 1, padding: "10px 14px", borderRight: `1px solid ${C.line}` }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: C.indigo, marginBottom: 4 }}>NEEDS</div>
            <div style={{ fontFamily: SANS, fontSize: 13, color: C.ink, lineHeight: 1.35 }}>{m.ask}</div>
          </div>
          <div style={{ flex: 1, padding: "10px 14px" }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: C.inkSoft, marginBottom: 4 }}>OFFERS</div>
            <div style={{ fontFamily: SANS, fontSize: 13, color: C.ink, lineHeight: 1.35 }}>{m.offer}</div>
          </div>
        </div>

        {/* Tags — the filter handles, footer */}
        {m.tags && m.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {m.tags.map((t) => {
              const active = activeTags?.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => onTagClick(t)}
                  style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.05em", padding: "3px 9px", background: active ? C.indigo : "transparent", color: active ? C.paper : C.indigo, border: `1px solid ${active ? C.indigo : C.line}`, cursor: "pointer" }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DossierRow({ label, value, italic }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.16em", color: C.inkSoft, textTransform: "uppercase", width: 62, flexShrink: 0, paddingTop: 1 }}>{label}</div>
      <div style={{ fontFamily: SANS, fontSize: 13.5, color: C.ink, lineHeight: 1.45, fontStyle: italic ? "italic" : "normal" }}>{value}</div>
    </div>
  );
}

/* ----------------------- onboarding flow -------------------- */

const ONBOARD_QUESTIONS = [
  {
    key: "name",
    eyebrow: "First, your name",
    q: "What should the wall call you?",
    placeholder: "Your name",
    small: true,
  },
  {
    key: "built",
    eyebrow: "Question 1 of 5 · Trajectory",
    q: "What are you building now — and what would you build if skill weren't the constraint?",
    placeholder: "Right now I'm building… but if I could do anything, I'd build…",
  },
  {
    key: "tasteInto",
    eyebrow: "Question 2 of 5 · Taste",
    q: "Name one thing you'd defend forever — a film, album, object, place, or dish. Why that one?",
    placeholder: "Pather Panchali, because restraint is the highest technology…",
  },
  {
    key: "contrarian",
    eyebrow: "Question 3 of 5 · Mind",
    q: "What do you believe about AI that most of this room would push back on?",
    placeholder: "Everyone's wrong about…",
  },
  {
    key: "offer",
    eyebrow: "Question 4 of 5 · Offer",
    q: "What could you teach for an hour tomorrow, with zero preparation?",
    placeholder: "I could teach…",
  },
  {
    key: "ask",
    eyebrow: "Question 5 of 5 · Need",
    q: "What do you need right now that someone in this room could plausibly give you?",
    placeholder: "I need…",
  },
  {
    key: "dream",
    eyebrow: "One more · Ambition",
    q: "Who or what would you kill to work with?",
    placeholder: "My dream collaboration is…",
  },
];

function Onboarding({ onComplete, onClose }) {
  const [step, setStep] = useState(0);           // question index
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("ask");     // ask | reading | reveal
  const [profile, setProfile] = useState(null);
  const [authResult, setAuthResult] = useState(null);
  const [error, setError] = useState(null);
  const [val, setVal] = useState("");

  const total = ONBOARD_QUESTIONS.length;
  const cur = ONBOARD_QUESTIONS[step];

  const next = async () => {
    const updated = { ...answers, [cur.key]: val.trim() };
    setAnswers(updated);
    setVal("");
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      setPhase("reading");
      setError(null);
      try {
        const res = await api("/members", {
          method: "POST",
          body: {
            name: updated.name,
            built: updated.built || null,
            taste: updated.tasteInto || null,
            contrarian: updated.contrarian || null,
            offer: updated.offer || null,
            ask: updated.ask || null,
            dream: updated.dream || null,
          },
        });
        setAuthResult(res);
        setProfile(adaptMember(res.member));
        setPhase("reveal");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't reach the club right now — try again.");
        setPhase("ask");
      }
    }
  };

  const finish = () => {
    onComplete(authResult);
    onClose();
  };

  const canProceed = val.trim().length > 0 || (!cur.required && step > 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,22,27,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
      <div style={{ background: C.paperDeep, border: `1px solid ${C.ink}`, maxWidth: 560, width: "100%", padding: "34px 34px 30px", minHeight: 340, display: "flex", flexDirection: "column" }}>

        {/* Progress dots */}
        {phase === "ask" && (
          <div style={{ display: "flex", gap: 5, marginBottom: 26 }}>
            {ONBOARD_QUESTIONS.map((_, i) => (
              <div key={i} style={{ height: 3, flex: 1, background: i <= step ? C.indigo : C.line, transition: "background 250ms" }} />
            ))}
          </div>
        )}

        {/* ASK phase — one question at a time */}
        {phase === "ask" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Eyebrow color={C.indigo}>{cur.eyebrow}</Eyebrow>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: cur.small ? 30 : 25, letterSpacing: "-0.02em", color: C.ink, lineHeight: 1.15, marginBottom: 24 }}>
              {cur.q}
            </div>
            {cur.small ? (
              <input
                autoFocus
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canProceed && next()}
                placeholder={cur.placeholder}
                style={{ width: "100%", fontFamily: SANS, fontSize: 22, fontWeight: 700, color: C.ink, background: "transparent", border: "none", borderBottom: `2px solid ${C.line}`, padding: "8px 2px", outline: "none" }}
              />
            ) : (
              <textarea
                autoFocus
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder={cur.placeholder}
                style={{ width: "100%", fontFamily: SERIF, fontSize: 17, lineHeight: 1.55, color: C.ink, background: C.paper, border: `1px solid ${C.line}`, padding: "14px 16px", resize: "vertical", minHeight: 120, outline: "none" }}
              />
            )}
            {error && (
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: C.stamp, marginTop: 10 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 24, alignItems: "center" }}>
              <button
                onClick={next}
                disabled={!canProceed}
                style={{ padding: "13px 26px", background: canProceed ? C.indigo : C.line, color: C.paper, border: "none", fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: canProceed ? "pointer" : "not-allowed" }}
              >
                {step === total - 1 ? "READ ME →" : "NEXT →"}
              </button>
              {step > 0 && (
                <button onClick={() => { setStep(step - 1); setVal(answers[ONBOARD_QUESTIONS[step - 1].key] || ""); }} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", background: "transparent", border: "none", color: C.inkSoft, cursor: "pointer" }}>
                  ← BACK
                </button>
              )}
              <button onClick={onClose} style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", background: "transparent", border: "none", color: C.inkSoft, cursor: "pointer" }}>
                EXIT
              </button>
            </div>
          </div>
        )}

        {/* READING phase — the club processes you */}
        {phase === "reading" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", border: `2px solid ${C.line}`, borderTopColor: C.indigo, animation: "cacspin 0.9s linear infinite" }} />
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.22em", color: C.inkSoft }}>THE CLUB IS READING YOU…</div>
            <style>{`@keyframes cacspin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* REVEAL phase — your generated card */}
        {phase === "reveal" && profile && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Eyebrow color={C.indigo}>This is how the room will see you</Eyebrow>
            <div style={{ border: `1px solid ${C.indigo}`, background: C.paper, marginTop: 8 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "18px 20px", background: "rgba(108,105,214,0.06)", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${C.indigo}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 15, color: C.indigo }}>
                  {(answers.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 19, color: C.ink, letterSpacing: "-0.015em" }}>{answers.name}</div>
                  <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: C.indigo, marginTop: 2 }}>“{profile.epithet}”</div>
                </div>
              </div>
              <div style={{ padding: "18px 20px" }}>
                <div style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.5, color: C.ink }}>{profile.line}</div>
                {profile.tags?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                    {profile.tags.map((t) => (
                      <span key={t} style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.05em", padding: "3px 9px", color: C.indigo, border: `1px solid ${C.line}` }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: C.inkSoft, marginTop: 14, lineHeight: 1.5 }}>
              The club wrote a first draft of you from your answers. You own it now — edit anything, anytime.
            </div>
            <button
              onClick={finish}
              style={{ marginTop: 20, padding: "14px 0", background: C.indigo, color: C.paper, border: "none", fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: "pointer" }}
            >
              JOIN THE WALL →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------- corpus chatbot ------------------------ */

async function askCorpus(question, members) {
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

const SAMPLE_QUESTIONS = [
  "who's into lovable?",
  "who should I meet if I'm building agents?",
  "whose taste runs melancholic?",
  "who can teach me RAG?",
];

function CorpusBar({ members }) {
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

/* ---------------------- front + directory -------------------- */

function formatSessionWhen(startsAt) {
  const d = new Date(startsAt);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function SessionCard({ me }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = none scheduled
  const [rsvps, setRsvps] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const all = await api("/sessions");
    const upcoming = all.filter((s) => new Date(s.starts_at) >= new Date());
    const next = upcoming[0] || null;
    setSession(next);
    if (next) setRsvps(await api(`/sessions/${next.id}/rsvps`));
  };

  useEffect(() => {
    load().catch(() => setSession(null));
  }, []);

  const myStatus = (() => {
    if (!me || !rsvps) return null;
    if (rsvps.going.some((m) => m.id === me.id)) return "going";
    if (rsvps.maybe.some((m) => m.id === me.id)) return "maybe";
    if (rsvps.no.some((m) => m.id === me.id)) return "no";
    return null;
  })();

  const rsvp = async (status) => {
    if (!me || !session || busy) return;
    setBusy(true);
    try {
      await api(`/sessions/${session.id}/rsvp`, { method: "PUT", auth: true, body: { status } });
      setRsvps(await api(`/sessions/${session.id}/rsvps`));
    } catch {
      // best-effort
    } finally {
      setBusy(false);
    }
  };

  if (session === undefined) {
    return (
      <div style={{ border: `1px solid ${C.ink}`, padding: "14px 20px", background: C.paperDeep }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.24em", color: C.inkSoft }}>NEXT SESSION</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, color: C.ink, marginTop: 4 }}>Loading…</div>
      </div>
    );
  }

  if (session === null) {
    return (
      <div style={{ border: `1px solid ${C.ink}`, padding: "14px 20px", background: C.paperDeep }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.24em", color: C.inkSoft }}>NEXT SESSION</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, color: C.ink, marginTop: 4 }}>None scheduled yet</div>
      </div>
    );
  }

  const rsvpBtn = (status, label) => (
    <button
      onClick={() => rsvp(status)}
      disabled={busy || !me}
      title={me ? "" : "Sign in to RSVP"}
      style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", padding: "5px 11px",
        background: myStatus === status ? C.indigo : "transparent",
        color: myStatus === status ? C.paper : C.ink,
        border: `1px solid ${myStatus === status ? C.indigo : C.line}`,
        cursor: me ? "pointer" : "not-allowed", opacity: me ? 1 : 0.6,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ border: `1px solid ${C.ink}`, padding: "14px 20px", background: C.paperDeep }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.24em", color: C.inkSoft }}>NEXT SESSION</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, color: C.ink, marginTop: 4 }}>
        {formatSessionWhen(session.starts_at)}{session.venue ? ` · ${session.venue}` : ""}
      </div>
      {rsvps && (
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: C.inkSoft, marginTop: 6 }}>
          {rsvps.going.length} going{rsvps.maybe.length ? ` · ${rsvps.maybe.length} maybe` : ""}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {rsvpBtn("going", "I'M GOING")}
        {rsvpBtn("maybe", "MAYBE")}
        {rsvpBtn("no", "CAN'T MAKE IT")}
      </div>
    </div>
  );
}

function FrontPage({ members, pitchCount, me, onJoin, onUpdateLine, currentUser, onEditProfile }) {
  const [activeTags, setActiveTags] = useState([]);
  const allTags = [...new Set(members.flatMap((m) => m.tags || []))].sort();
  const toggleTag = (t) =>
    setActiveTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const visible = activeTags.length
    ? members.filter((m) => activeTags.every((t) => (m.tags || []).includes(t)))
    : members;
  return (
    <div>
      <div style={{ padding: "56px 0 8px" }}>
        <Eyebrow>Est. Kolkata · Sessions monthly · The room remembers</Eyebrow>
        <Wordmark size={58} />
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: C.inkSoft, marginTop: 18, maxWidth: 560, lineHeight: 1.6 }}>
          A room of people building with AI in Calcutta. This is the version of the club that remembers: who's here, what they've made, and what they need next.
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, margin: "26px 0 6px", flexWrap: "wrap" }}>
        <SessionCard me={me} />
        <div style={{ border: `1px solid ${C.ink}`, padding: "14px 20px", background: C.ink }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.24em", color: C.paperDeep }}>ON THE WALL</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, color: C.paper, marginTop: 4 }}>{members.length} members · {pitchCount} open pitches</div>
        </div>
        <button onClick={onJoin} style={{ border: "none", padding: "14px 24px", background: C.indigo, color: C.paper, fontFamily: MONO, fontSize: 12, letterSpacing: "0.22em", cursor: "pointer" }}>
          JOIN THE WALL →
        </button>
      </div>

      {/* Transparent chatbot: the centrepiece — ask the corpus anything */}
      <div style={{ margin: "40px 0 8px" }}>
        <CorpusBar members={members} />
      </div>

      <Rule />
      <Eyebrow>The living directory</Eyebrow>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 26, color: C.ink, marginBottom: 20 }}>
        Who's in the room
      </div>

      {/* Filter bar: the corpus made scannable */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.22em", color: C.inkSoft, marginRight: 6 }}>FILTER</span>
        {allTags.map((t) => {
          const active = activeTags.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.06em", padding: "5px 12px", background: active ? C.indigo : C.paper, color: active ? C.paper : C.ink, border: `1px solid ${active ? C.indigo : C.line}`, cursor: "pointer" }}
            >
              {t}
            </button>
          );
        })}
        {activeTags.length > 0 && (
          <button onClick={() => setActiveTags([])} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", padding: "5px 10px", background: "transparent", color: C.stamp, border: "none", cursor: "pointer" }}>
            CLEAR ×
          </button>
        )}
      </div>
      {activeTags.length > 0 && (
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: C.inkSoft, marginBottom: 16 }}>
          {visible.length} member{visible.length !== 1 ? "s" : ""} into {activeTags.join(" + ")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 18 }}>
        {visible.map((m) => (
          <MemberCard key={m.id} m={m} onUpdateLine={onUpdateLine} onTagClick={toggleTag} activeTags={activeTags} isMe={m.id === currentUser} onEditProfile={onEditProfile} />
        ))}
      </div>
      {visible.length === 0 && (
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.14em", color: C.inkSoft, padding: "32px 0" }}>
          NOBODY ON THE WALL MATCHES THAT COMBINATION — YET.
        </div>
      )}
    </div>
  );
}

/* ------------------------- pitch board ----------------------- */

function PitchSlide({ p, me }) {
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

function PitchBoard({ members, pitches, setPitches, currentUser, me }) {
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

/* ------------------------- room tonight ---------------------- */

function RoomTonight({ members }) {
  // Live check-ins (QR scan → this wall, polling GET /sessions/{id}/checkins)
  // are ROADMAP.md Phase 7 — deliberately not built yet, so this reads
  // honestly empty rather than replaying scripted fake names.
  const [checked] = useState([]);
  const reduced = useReducedMotion();

  const byName = Object.fromEntries(members.map((m) => [m.name, m]));

  return (
    <div style={{ background: C.dark, margin: "0 -24px", padding: "56px 24px 80px", minHeight: "80vh" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.3em", color: C.indigoGlow, marginBottom: 12 }}>
              LIVE · SAT 25 JUL · PARK STREET
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
                    “{m.epithet}” · needs {m.ask.toLowerCase()}
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

/* ------------------------- auth + editor --------------------- */

function LoginModal({ onNew, onClose }) {
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

function ProfileEditor({ member, onSave, onClose }) {
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

/* ---------------------------- shell -------------------------- */

export default function CalcuttaAIClub() {
  const [tab, setTab] = useState("club");
  const [members, setMembers] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [joining, setJoining] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);   // member id or null
  const [loginOpen, setLoginOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const me = members.find((m) => m.id === currentUser) || null;

  useEffect(() => {
    (async () => {
      try {
        const [memberRows, pitchRows] = await Promise.all([api("/members"), api("/pitches")]);
        setMembers(memberRows.map(adaptMember));
        setPitches(pitchRows.map(adaptPitch));
      } catch {
        // Backend unreachable — the wall just starts empty rather than crashing.
      } finally {
        setLoaded(true);
      }
      const token = getToken();
      if (token) {
        try {
          const me = await api("/me", { auth: true });
          setCurrentUser(me.id);
          setMembers((ms) => (ms.some((m) => m.id === me.id) ? ms : [adaptMember(me), ...ms]));
        } catch {
          // stale/invalid token — stay signed out
        }
      }
    })();
  }, []);

  const addMember = (authResult) => {
    if (!authResult) return;
    setToken(authResult.token);
    const adapted = adaptMember(authResult.member);
    setMembers((ms) => [adapted, ...ms]);
    setCurrentUser(adapted.id);
  };

  const updateLine = async (id, line) => {
    if (id !== currentUser) return;   // owner-only
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, line } : m)));
    try {
      await api("/me", { method: "PATCH", auth: true, body: { line } });
    } catch {
      // best-effort; the local card already reflects the edit
    }
  };

  const saveProfile = async (updated) => {
    const body = {
      line: updated.line,
      field: updated.industry,
      built: updated.built,
      build_into: updated.buildInto,
      taste: updated.tasteInto,
      dream: updated.dream,
      ask: updated.ask,
      offer: updated.offer,
    };
    try {
      const saved = await api("/me", { method: "PATCH", auth: true, body });
      setMembers((ms) => ms.map((m) => (m.id === updated.id ? adaptMember(saved) : m)));
    } catch {
      setMembers((ms) => ms.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
    }
  };

  const tabs = [
    { id: "club", label: "THE CLUB" },
    { id: "pitch", label: "PITCH BOARD" },
    { id: "room", label: "ROOM TONIGHT" },
  ];

  return (
    <div style={{ background: C.paper, minHeight: "100vh", color: C.ink }}>
      <div style={{ borderBottom: `1px solid ${C.ink}`, background: C.paper, position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "stretch", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontFamily: SANS, fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", padding: "16px 0" }}>
            calcutta <span style={{ color: C.indigo, margin: "0 4px" }}>ai</span> club
          </div>
          <div style={{ display: "flex" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  border: "none",
                  borderLeft: `1px solid ${C.line}`,
                  background: tab === t.id ? C.ink : "transparent",
                  color: tab === t.id ? C.paper : C.ink,
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  padding: "0 20px",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
            {me ? (
              <button
                onClick={() => setEditingProfile(true)}
                style={{ border: "none", borderLeft: `1px solid ${C.line}`, background: C.indigo, color: C.paper, fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", padding: "0 18px", cursor: "pointer" }}
                title="Edit your record"
              >
                {me.name.split(" ")[0].toUpperCase()} · EDIT
              </button>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                style={{ border: "none", borderLeft: `1px solid ${C.line}`, background: C.ink, color: C.paper, fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", padding: "0 18px", cursor: "pointer" }}
              >
                SIGN IN
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        {tab === "club" && <FrontPage members={members} pitchCount={pitches.length} me={me} onJoin={() => setJoining(true)} onUpdateLine={updateLine} currentUser={currentUser} onEditProfile={() => setEditingProfile(true)} />}
        {tab === "pitch" && <PitchBoard members={members} pitches={pitches} setPitches={setPitches} currentUser={currentUser} me={me} />}
        {tab === "room" && <RoomTonight members={members} />}
      </div>

      {joining && <Onboarding onComplete={addMember} onClose={() => setJoining(false)} />}
      {loginOpen && <LoginModal onNew={() => setJoining(true)} onClose={() => setLoginOpen(false)} />}
      {editingProfile && me && <ProfileEditor member={me} onSave={saveProfile} onClose={() => setEditingProfile(false)} />}
    </div>
  );
}
