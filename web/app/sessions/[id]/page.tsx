"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, getToken, ApiError, type SessionDetail, type RsvpsGrouped } from "@/lib/api";

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [rsvps, setRsvps] = useState<RsvpsGrouped | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  async function load() {
    const [d, r] = await Promise.all([
      api<SessionDetail>(`/sessions/${sessionId}`),
      api<RsvpsGrouped>(`/sessions/${sessionId}/rsvps`),
    ]);
    setDetail(d);
    setRsvps(r);
  }

  useEffect(() => {
    load().catch(() => setError("Session not found."));
  }, [sessionId]);

  async function rsvp(status: "going" | "maybe" | "no") {
    setError(null);
    if (!getToken()) {
      setError("Join first before RSVPing.");
      return;
    }
    setRsvpLoading(true);
    try {
      await api(`/sessions/${sessionId}/rsvp`, { method: "PUT", auth: true, body: { status } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setRsvpLoading(false);
    }
  }

  if (error && !detail) return <main className="container">{error}</main>;
  if (!detail || !rsvps) return <main className="container">Loading…</main>;

  const { session, projects } = detail;

  return (
    <main className="container">
      <h1>{session.title}</h1>
      <p className="subtitle">
        {new Date(session.starts_at).toLocaleString()} {session.venue && `· ${session.venue}`}
      </p>

      <p>
        <Link href={`/sessions/${sessionId}/invite`}>Open the invite page →</Link>
      </p>

      {session.voting_open && (
        <div className="section">
          <Link href={`/sessions/${sessionId}/board`}>
            <button>Open live scoreboard →</button>
          </Link>
        </div>
      )}

      <div className="section">
        <h2>RSVP</h2>
        <div className="rsvp-row">
          <button disabled={rsvpLoading} onClick={() => rsvp("going")}>
            Going
          </button>
          <button className="secondary" disabled={rsvpLoading} onClick={() => rsvp("maybe")}>
            Maybe
          </button>
          <button className="secondary" disabled={rsvpLoading} onClick={() => rsvp("no")}>
            Can&apos;t make it
          </button>
        </div>
        {error && <p className="error">{error}</p>}

        <div className="card-meta">Going ({rsvps.going.length})</div>
        <div className="avatar-row">
          {rsvps.going.map((m) => (
            <div className="avatar" key={m.id} title={m.name}>
              {initials(m.name)}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Projects in this session</h2>
        {projects.length === 0 && <p className="subtitle">No projects entered yet.</p>}
        {projects.map((p) => (
          <div className="card" key={p.id}>
            <div className="card-title">{p.title}</div>
            {p.tagline && <div>{p.tagline}</div>}
            <div className="card-meta">by {p.owner.name}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
