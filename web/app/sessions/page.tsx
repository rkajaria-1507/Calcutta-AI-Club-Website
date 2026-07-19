"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Session } from "@/lib/api";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Session[]>("/sessions")
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container">
      <h1>Sessions</h1>
      <p className="subtitle">Club meetups. RSVP and demo day happen here.</p>

      {loading && <p>Loading…</p>}
      {!loading && sessions.length === 0 && <p className="subtitle">No sessions yet.</p>}

      {sessions.map((s) => (
        <Link href={`/sessions/${s.id}`} key={s.id} style={{ textDecoration: "none" }}>
          <div className="card">
            <div className="card-title">
              {s.title} {s.voting_open && <span className="pill open">voting open</span>}
            </div>
            <div className="card-meta">
              {new Date(s.starts_at).toLocaleString()} {s.venue && `· ${s.venue}`}
            </div>
            {s.topic && <div className="card-meta">{s.topic}</div>}
          </div>
        </Link>
      ))}
    </main>
  );
}
