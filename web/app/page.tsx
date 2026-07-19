"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getToken, ApiError, type Project, type Member } from "@/lib/api";

export default function WallPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [p, m] = await Promise.all([
      api<Project[]>("/projects"),
      api<Member[]>("/members"),
    ]);
    setProjects(p);
    setMembers(m);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!getToken()) {
      setError("Join first before posting a project.");
      return;
    }
    setSubmitting(true);
    try {
      await api<Project>("/projects", {
        method: "POST",
        auth: true,
        body: {
          title,
          tagline: tagline || null,
          link: link || null,
          image_url: imageUrl || null,
        },
      });
      setTitle("");
      setTagline("");
      setLink("");
      setImageUrl("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>The Wall</h1>
      <p className="subtitle">What the club has built. Newest first.</p>

      <div className="section">
        {showForm ? (
          <form onSubmit={handleSubmit}>
            <div>
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
            </div>
            <div>
              <label>One-liner</label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} />
            </div>
            <div>
              <label>Link</label>
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label>Image URL (optional)</label>
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>
            {error && <p className="error">{error}</p>}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" disabled={submitting || !title.trim()}>
                {submitting ? "Posting…" : "Post it"}
              </button>
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)}>+ I built something</button>
        )}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="section">
            <h2>Ship log</h2>
            {projects.length === 0 && <p className="subtitle">Nothing posted yet — be the first.</p>}
            {projects.map((p) => (
              <div className="card" key={p.id}>
                <div className="card-title">
                  {p.link ? (
                    <a href={p.link} target="_blank" rel="noreferrer">
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                </div>
                {p.tagline && <div>{p.tagline}</div>}
                <div className="card-meta">
                  by <Link href={`/members/${p.owner.id}`}>{p.owner.name}</Link>
                </div>
              </div>
            ))}
          </div>

          <div className="section">
            <h2>Members</h2>
            <div className="grid">
              {members.map((m) => (
                <div className="card" key={m.id}>
                  <div className="card-title">
                    <Link href={`/members/${m.id}`}>{m.name}</Link>
                  </div>
                  {m.tagline && <div className="card-meta">{m.tagline}</div>}
                  {m.building_now && <div className="building-now">rn building: {m.building_now}</div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
