"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api, getToken, ApiError, type LeaderboardEntry, type MyVoteOut } from "@/lib/api";

const POLL_MS = 2000;

export default function ScoreboardPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      const rows = await api<LeaderboardEntry[]>(`/sessions/${sessionId}/leaderboard`);
      setEntries(rows);
    } catch {
      // swallow poll errors, keep last good state
    }
  }, [sessionId]);

  const loadMyVotes = useCallback(async () => {
    if (!getToken()) return;
    try {
      const rows = await api<MyVoteOut[]>(`/sessions/${sessionId}/my-votes`, { auth: true });
      const map: Record<string, number> = {};
      rows.forEach((v) => (map[v.project_id] = v.score));
      setMyVotes(map);
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    loadLeaderboard();
    loadMyVotes();

    const interval = setInterval(() => {
      if (document.hidden) return;
      loadLeaderboard();
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [loadLeaderboard, loadMyVotes]);

  async function vote(projectId: string) {
    setError(null);
    if (!getToken()) {
      setError("Join first before voting.");
      return;
    }
    setVotingId(projectId);
    try {
      await api(`/sessions/${sessionId}/vote`, {
        method: "POST",
        auth: true,
        body: { project_id: projectId, score: 1 },
      });
      await Promise.all([loadLeaderboard(), loadMyVotes()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setVotingId(null);
    }
  }

  return (
    <main className="container board">
      <h1>Live Scoreboard</h1>
      <p className="subtitle">Scan, vote, watch the ranks move.</p>
      {error && <p className="error">{error}</p>}

      <div className="board-list">
        {entries.length === 0 && <p className="subtitle">No projects entered in this session yet.</p>}
        {entries.map((e) => {
          const voted = myVotes[e.project_id] !== undefined;
          return (
            <div className="board-row" key={e.project_id}>
              <div className="board-rank">#{e.rank}</div>
              <div className="board-title">
                {e.title}
                <div className="card-meta">by {e.owner_name}</div>
              </div>
              <div className="board-score">{e.score} pts</div>
              <button
                className={voted ? "secondary" : undefined}
                disabled={voted || votingId === e.project_id}
                onClick={() => vote(e.project_id)}
              >
                {voted ? "Voted" : "Vote"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
