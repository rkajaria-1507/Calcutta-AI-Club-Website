"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  api,
  getToken,
  setToken,
  ApiError,
  type Member,
  type RsvpsGrouped,
  type SessionDetail,
  type SessionPost,
  type SessionReactions,
} from "@/lib/api";

const HYPE_EMOJIS = ["🔥", "✨", "🚀", "❤️"];
const AVATAR_EMOJIS = ["🤖", "🧠", "🔥", "✨", "🚀", "🐍", "🎨", "🎧"];

type RsvpStatus = "going" | "maybe" | "no";

function isEmojiAvatar(avatarUrl: string | null): boolean {
  return !!avatarUrl && !avatarUrl.startsWith("http");
}

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

function Avatar({ name, avatarUrl, size }: { name: string; avatarUrl: string | null; size?: "lg" }) {
  const cls = size === "lg" ? "avatar avatar-lg" : "avatar";
  if (avatarUrl && avatarUrl.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={avatarUrl} alt={name} title={name} />;
  }
  return (
    <div className={cls} title={name}>
      {isEmojiAvatar(avatarUrl) ? avatarUrl : initials(name)}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => {
    const left = (i * 37) % 100;
    const delay = ((i * 13) % 10) / 10;
    const duration = 1.4 + ((i * 7) % 10) / 10;
    const colors = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];
    return (
      <span
        key={i}
        className="confetti-piece"
        style={{
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          background: colors[i % colors.length],
          transform: `rotate(${(i * 47) % 360}deg)`,
        }}
      />
    );
  });
  return <div className="confetti" aria-hidden="true">{pieces}</div>;
}

function formatWhen(startsAt: string): string {
  const d = new Date(startsAt);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function InvitePage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [rsvps, setRsvps] = useState<RsvpsGrouped | null>(null);
  const [posts, setPosts] = useState<SessionPost[]>([]);
  const [reactions, setReactions] = useState<SessionReactions | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [hasToken, setHasToken] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [plusOnes, setPlusOnes] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Inline join flow
  const [pendingStatus, setPendingStatus] = useState<RsvpStatus | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinEmoji, setJoinEmoji] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const joinRef = useRef<HTMLDivElement | null>(null);

  // Hype wall composer
  const [postBody, setPostBody] = useState("");
  const [postLoading, setPostLoading] = useState(false);

  const loadAll = useCallback(async () => {
    const [d, r, p, re] = await Promise.all([
      api<SessionDetail>(`/sessions/${sessionId}`),
      api<RsvpsGrouped>(`/sessions/${sessionId}/rsvps`),
      api<SessionPost[]>(`/sessions/${sessionId}/posts`),
      api<SessionReactions>(`/sessions/${sessionId}/reactions`, { auth: true }),
    ]);
    setDetail(d);
    setRsvps(r);
    setPosts(p);
    setReactions(re);
  }, [sessionId]);

  useEffect(() => {
    setHasToken(!!getToken());
    loadAll().catch(() => setError("This invite doesn't exist (or the event was removed)."));
    if (getToken()) {
      api<Member>("/me", { auth: true }).then(setMe).catch(() => {});
    }
  }, [loadAll]);

  const myStatus: RsvpStatus | null = (() => {
    if (!me || !rsvps) return null;
    if (rsvps.going.some((m) => m.id === me.id)) return "going";
    if (rsvps.maybe.some((m) => m.id === me.id)) return "maybe";
    if (rsvps.no.some((m) => m.id === me.id)) return "no";
    return null;
  })();

  const myPlusOnes = me && rsvps ? rsvps.going.find((m) => m.id === me.id)?.plus_ones ?? 0 : 0;

  useEffect(() => {
    setPlusOnes(myPlusOnes);
  }, [myPlusOnes]);

  async function sendRsvp(status: RsvpStatus, guests: number) {
    setError(null);
    setRsvpLoading(true);
    try {
      await api(`/sessions/${sessionId}/rsvp`, {
        method: "PUT",
        auth: true,
        body: { status, plus_ones: status === "going" ? guests : 0 },
      });
      await loadAll();
      if (status === "going") {
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 2200);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setRsvpLoading(false);
    }
  }

  function rsvp(status: RsvpStatus) {
    if (!getToken()) {
      setPendingStatus(status);
      setTimeout(() => joinRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    sendRsvp(status, status === "going" ? plusOnes : 0);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setJoinLoading(true);
    try {
      const res = await api<{ token: string; member: Member }>("/join", {
        method: "POST",
        body: { name: joinName, avatar_url: joinEmoji },
      });
      setToken(res.token);
      setMe(res.member);
      setHasToken(true);
      const status = pendingStatus ?? "going";
      setPendingStatus(null);
      await sendRsvp(status, 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setJoinLoading(false);
    }
  }

  async function toggleHype(emoji: string) {
    if (!getToken()) {
      setPendingStatus("going");
      joinRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const isMine = reactions?.mine.includes(emoji);
    try {
      await api(`/sessions/${sessionId}/react`, {
        method: isMine ? "DELETE" : "POST",
        auth: true,
        body: { emoji },
      });
    } catch {
      // 409 = already reacted; refresh below fixes state either way
    }
    try {
      setReactions(await api<SessionReactions>(`/sessions/${sessionId}/reactions`, { auth: true }));
    } catch {
      // keep last good state
    }
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postBody.trim()) return;
    setError(null);
    setPostLoading(true);
    try {
      const created = await api<SessionPost>(`/sessions/${sessionId}/posts`, {
        method: "POST",
        auth: true,
        body: { body: postBody.trim() },
      });
      setPosts((prev) => [created, ...prev]);
      setPostBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setPostLoading(false);
    }
  }

  async function deletePost(postId: string) {
    try {
      await api(`/sessions/${sessionId}/posts/${postId}`, { method: "DELETE", auth: true });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that post");
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link — copy it from the address bar.");
    }
  }

  if (error && !detail) return <main className="container">{error}</main>;
  if (!detail || !rsvps) return <main className="container">Loading…</main>;

  const { session } = detail;
  const goingTotal = rsvps.going.length + rsvps.going.reduce((sum, m) => sum + m.plus_ones, 0);

  return (
    <main className="invite">
      {celebrating && <Confetti />}

      <div className="invite-cover">
        {session.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.cover_image_url} alt={session.title} />
        ) : (
          <div className="invite-cover-fallback">🎉</div>
        )}
      </div>

      <div className="invite-body">
        <h1 className="invite-title">{session.title}</h1>
        <p className="invite-when">{formatWhen(session.starts_at)}</p>
        {session.venue && <p className="invite-venue">📍 {session.venue}</p>}
        {session.host_blurb && <p className="invite-blurb">{session.host_blurb}</p>}

        {/* Hype pills */}
        <div className="hype-row">
          {HYPE_EMOJIS.map((emoji) => {
            const count = reactions?.counts[emoji] ?? 0;
            const mine = reactions?.mine.includes(emoji) ?? false;
            return (
              <button
                key={emoji}
                className={`hype-pill${mine ? " mine" : ""}`}
                onClick={() => toggleHype(emoji)}
              >
                {emoji} {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* RSVP hero */}
        <div className="rsvp-hero">
          <button
            className={`rsvp-btn going${myStatus === "going" ? " selected" : ""}`}
            disabled={rsvpLoading}
            onClick={() => rsvp("going")}
          >
            I&apos;m going 🎉
          </button>
          <button
            className={`rsvp-btn${myStatus === "maybe" ? " selected" : ""}`}
            disabled={rsvpLoading}
            onClick={() => rsvp("maybe")}
          >
            Maybe
          </button>
          <button
            className={`rsvp-btn${myStatus === "no" ? " selected" : ""}`}
            disabled={rsvpLoading}
            onClick={() => rsvp("no")}
          >
            Can&apos;t make it
          </button>
        </div>

        {myStatus === "going" && (
          <div className="plus-ones">
            <span>Bringing anyone?</span>
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                className={`plus-one-btn${plusOnes === n ? " selected" : ""}`}
                disabled={rsvpLoading}
                onClick={() => {
                  setPlusOnes(n);
                  sendRsvp("going", n);
                }}
              >
                {n === 0 ? "Just me" : `+${n}`}
              </button>
            ))}
          </div>
        )}

        {myStatus === "going" && (
          <div className="share-row">
            <span className="share-msg">You&apos;re in! 🎊</span>
            <button className="secondary" onClick={share}>
              {copied ? "Link copied ✓" : "Share this invite"}
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {/* Inline join form for visitors without an identity */}
        {!hasToken && (
          <div className={`invite-join${pendingStatus ? " highlight" : ""}`} ref={joinRef}>
            <h2>
              {pendingStatus
                ? "Almost there — tell us who you are"
                : "New here? Join in 10 seconds"}
            </h2>
            <form onSubmit={handleJoin}>
              <div>
                <label>Name</label>
                <input
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label>Pick an avatar (optional)</label>
                <div className="emoji-row">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-btn${joinEmoji === emoji ? " selected" : ""}`}
                      onClick={() => setJoinEmoji(joinEmoji === emoji ? null : emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={joinLoading || !joinName.trim()}>
                {joinLoading
                  ? "Joining…"
                  : pendingStatus === "going"
                    ? "Join & RSVP: I'm going 🎉"
                    : pendingStatus === "maybe"
                      ? "Join & RSVP: Maybe"
                      : pendingStatus === "no"
                        ? "Join & RSVP: Can't make it"
                        : "Join the club"}
              </button>
            </form>
          </div>
        )}

        {/* Face wall */}
        <div className="section">
          <h2>
            {goingTotal > 0 ? `${goingTotal} going` : "Be the first to RSVP"}
          </h2>
          <div className="avatar-row">
            {rsvps.going.map((m) => (
              <Avatar key={m.id} name={m.name} avatarUrl={m.avatar_url} size="lg" />
            ))}
          </div>
          {rsvps.going.some((m) => m.plus_ones > 0) && (
            <p className="card-meta">
              {rsvps.going
                .filter((m) => m.plus_ones > 0)
                .map((m) => `${m.name} +${m.plus_ones}`)
                .join(" · ")}
            </p>
          )}
          {rsvps.maybe.length > 0 && (
            <>
              <div className="card-meta" style={{ marginTop: "0.75rem" }}>
                Maybe ({rsvps.maybe.length})
              </div>
              <div className="avatar-row">
                {rsvps.maybe.map((m) => (
                  <Avatar key={m.id} name={m.name} avatarUrl={m.avatar_url} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Hype wall */}
        <div className="section">
          <h2>Hype wall</h2>
          {hasToken ? (
            <form className="composer" onSubmit={submitPost}>
              <textarea
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                maxLength={280}
                rows={2}
                placeholder="Say something to the room…"
              />
              <div className="composer-footer">
                <span className="card-meta">{280 - postBody.length}</span>
                <button type="submit" disabled={postLoading || !postBody.trim()}>
                  {postLoading ? "Posting…" : "Post"}
                </button>
              </div>
            </form>
          ) : (
            <p className="subtitle">Join above to post on the wall.</p>
          )}
          {posts.length === 0 && <p className="subtitle">Nothing yet — start the hype.</p>}
          {posts.map((p) => (
            <div className="card post" key={p.id}>
              <div className="post-head">
                <Avatar name={p.author.name} avatarUrl={p.author.avatar_url} />
                <span className="post-author">{p.author.name}</span>
                <span className="card-meta">
                  {new Date(p.created_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {me?.id === p.author.id && (
                  <button className="post-delete" onClick={() => deletePost(p.id)} title="Delete">
                    ✕
                  </button>
                )}
              </div>
              <div className="post-body">{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
