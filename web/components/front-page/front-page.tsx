// @ts-nocheck
"use client";

import { useState } from "react";
import { C, MONO, SERIF, SANS } from "@/lib/theme";
import { Eyebrow } from "@/components/chrome/eyebrow";
import { Rule } from "@/components/chrome/rule";
import { Wordmark } from "@/components/chrome/wordmark";
import { SessionCard } from "@/components/sessions/session-card";
import { CorpusBar } from "@/components/corpus/corpus-bar";
import { MemberCard } from "@/components/members/member-card";

export function FrontPage({ members, pitchCount, me, onJoin, onUpdateLine, currentUser, onEditProfile }) {
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
