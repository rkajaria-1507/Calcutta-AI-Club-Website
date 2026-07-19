"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type Member, type Project } from "@/lib/api";

export default function MemberPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{ member: Member; projects: Project[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ member: Member; projects: Project[] }>(`/members/${params.id}`)
      .then(setData)
      .catch(() => setError("Member not found."));
  }, [params.id]);

  if (error) return <main className="container">{error}</main>;
  if (!data) return <main className="container">Loading…</main>;

  const { member, projects } = data;

  return (
    <main className="container">
      <h1>{member.name}</h1>
      {member.tagline && <p className="subtitle">{member.tagline}</p>}
      {member.building_now && <div className="building-now">rn building: {member.building_now}</div>}

      <div className="section" style={{ marginTop: "1.5rem" }}>
        <h2>Projects</h2>
        {projects.length === 0 && <p className="subtitle">No projects posted yet.</p>}
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
          </div>
        ))}
      </div>
    </main>
  );
}
