// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { api, getAdminSecret, setAdminSecret, clearAdminSecret, ApiError } from "@/lib/api";
import { C, MONO, SERIF, SANS } from "@/lib/theme";
import { Eyebrow } from "@/components/chrome/eyebrow";
import { formatSessionWhen } from "@/components/sessions/session-card";

const input = { width: "100%", padding: "11px 13px", fontFamily: SANS, fontSize: 14, background: C.paper, border: `1px solid ${C.line}`, color: C.ink, outline: "none", marginBottom: 12 };
const label = { fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", color: C.inkSoft, textTransform: "uppercase", marginBottom: 6 };

// Admin isn't a real login — it's the shared ADMIN_SECRET entered once and kept in
// localStorage, same pattern as the member token. See lib/api.ts.
export function AdminPanel({ onClose }) {
  const [unlocked, setUnlocked] = useState(() => !!getAdminSecret());
  const [secretInput, setSecretInput] = useState("");

  if (!unlocked) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(23,22,27,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
        <div style={{ background: C.paperDeep, border: `1px solid ${C.ink}`, maxWidth: 420, width: "100%", padding: 28 }}>
          <Eyebrow>Admin</Eyebrow>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 20, color: C.ink, marginBottom: 6 }}>Enter the admin secret</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
            Kept on this device only. You'll find out fast if it's wrong.
          </div>
          <input
            type="password"
            style={input}
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="ADMIN_SECRET"
            autoFocus
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              disabled={!secretInput.trim()}
              onClick={() => { setAdminSecret(secretInput.trim()); setUnlocked(true); }}
              style={{ flex: 1, padding: "13px 0", background: C.indigo, color: C.paper, border: "none", fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: secretInput.trim() ? "pointer" : "default", opacity: secretInput.trim() ? 1 : 0.5 }}
            >
              UNLOCK
            </button>
            <button onClick={onClose} style={{ padding: "13px 18px", background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: "pointer" }}>
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminSessions onClose={onClose} onLock={() => { clearAdminSecret(); setUnlocked(false); }} />;
}

function AdminSessions({ onClose, onLock }) {
  const [sessions, setSessions] = useState(undefined); // undefined = loading
  const [form, setForm] = useState({ title: "", topic: "", venue: "", startsAt: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setSessions(await api("/sessions"));
    } catch {
      setSessions([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async () => {
    if (!form.title.trim() || !form.startsAt || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api("/sessions", {
        method: "POST",
        admin: true,
        body: {
          title: form.title.trim(),
          topic: form.topic.trim() || null,
          venue: form.venue.trim() || null,
          starts_at: new Date(form.startsAt).toISOString(),
        },
      });
      setForm({ title: "", topic: "", venue: "", startsAt: "" });
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? "That secret was rejected — lock and re-enter it."
          : "Couldn't create the session — try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/sessions/${id}`, { method: "DELETE", admin: true });
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? "That secret was rejected — lock and re-enter it."
          : "Couldn't delete that session — try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,22,27,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
      <div style={{ background: C.paperDeep, border: `1px solid ${C.ink}`, maxWidth: 560, width: "100%", padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
        <Eyebrow>Admin</Eyebrow>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 22, color: C.ink, marginBottom: 4 }}>Sessions</div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: C.inkSoft, marginBottom: 18 }}>
          Create the next session or take one down. Deletes are soft — nothing is lost.
        </div>

        <div style={label}>Title</div>
        <input style={input} value={form.title} onChange={set("title")} placeholder="July Session" />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>Topic</div>
            <input style={input} value={form.topic} onChange={set("topic")} placeholder="Agents" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>Venue</div>
            <input style={input} value={form.venue} onChange={set("venue")} placeholder="Park Street" />
          </div>
        </div>
        <div style={label}>When</div>
        <input type="datetime-local" style={input} value={form.startsAt} onChange={set("startsAt")} />

        {error && <div style={{ fontFamily: SANS, fontSize: 12.5, color: "#b3261e", marginBottom: 10 }}>{error}</div>}

        <button
          disabled={busy || !form.title.trim() || !form.startsAt}
          onClick={create}
          style={{ width: "100%", padding: "13px 0", background: C.indigo, color: C.paper, border: "none", fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: "pointer", opacity: busy || !form.title.trim() || !form.startsAt ? 0.5 : 1, marginBottom: 20 }}
        >
          {busy ? "…" : "CREATE SESSION"}
        </button>

        <div style={label}>Existing</div>
        {sessions === undefined && (
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: C.inkSoft }}>Loading…</div>
        )}
        {sessions && sessions.length === 0 && (
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: C.inkSoft }}>None scheduled.</div>
        )}
        {sessions && sessions.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${C.line}`, padding: "10px 12px", marginBottom: 8, background: C.paper }}>
            <div>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13.5, color: C.ink }}>{s.title}</div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkSoft, marginTop: 2 }}>
                {formatSessionWhen(s.starts_at)}{s.venue ? ` · ${s.venue}` : ""}
              </div>
            </div>
            <button
              disabled={busy}
              onClick={() => remove(s.id)}
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", padding: "6px 10px", background: "transparent", color: C.stamp, border: `1px solid ${C.stamp}`, cursor: "pointer" }}
            >
              DELETE
            </button>
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px 0", background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", cursor: "pointer" }}>
            CLOSE
          </button>
          <button onClick={onLock} style={{ padding: "13px 18px", background: "transparent", color: C.inkSoft, border: `1px solid ${C.line}`, fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", cursor: "pointer" }}>
            LOCK
          </button>
        </div>
      </div>
    </div>
  );
}
