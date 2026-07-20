// @ts-nocheck
"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { C, MONO, SERIF, SANS } from "@/lib/theme";
import { adaptMember } from "@/lib/adapters";
import { Eyebrow } from "@/components/chrome/eyebrow";

export const ONBOARD_QUESTIONS = [
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

export function Onboarding({ onComplete, onClose }) {
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
