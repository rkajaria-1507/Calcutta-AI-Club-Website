"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, ApiError } from "@/lib/api";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string }>("/join", {
        method: "POST",
        body: { name, tagline: tagline || null },
      });
      setToken(res.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Join the club</h1>
      <p className="subtitle">Name + optional tagline. No password. Takes 10 seconds.</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </div>
        <div>
          <label>Tagline (optional)</label>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading || !name.trim()}>
          {loading ? "Joining…" : "Join"}
        </button>
      </form>
    </main>
  );
}
