// @ts-nocheck
"use client";

import { useState } from "react";
import { C, MONO, SERIF, SANS } from "@/lib/theme";
import { DossierRow } from "@/components/members/dossier-row";

export function MemberCard({ m, onUpdateLine, onTagClick, activeTags, isMe, onEditProfile }) {
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
