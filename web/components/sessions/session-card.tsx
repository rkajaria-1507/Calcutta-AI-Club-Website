// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { C, MONO, SERIF, SANS } from "@/lib/theme";

export function formatSessionWhen(startsAt) {
  const d = new Date(startsAt);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function SessionCard({ me }) {
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
