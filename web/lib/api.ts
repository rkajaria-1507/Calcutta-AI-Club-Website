const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "clubos_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; admin?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (options.auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  if (options.admin) {
    headers["X-Admin-Secret"] = options.admin;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.detail ?? `request failed (${res.status})`);
  }

  return data as T;
}

// ---------- Types ----------

export type Member = {
  id: string;
  name: string;
  avatar_url: string | null;
  tagline: string | null;
  building_now: string | null;
};

export type OwnerSummary = { id: string; name: string; avatar_url: string | null };

export type Project = {
  id: string;
  title: string;
  tagline: string | null;
  link: string | null;
  repo_url: string | null;
  image_url: string | null;
  session_id: string | null;
  owner: OwnerSummary;
  created_at: string;
};

export type Session = {
  id: string;
  title: string;
  topic: string | null;
  venue: string | null;
  starts_at: string;
  voting_open: boolean;
};

export type SessionDetail = {
  session: Session;
  rsvp_counts: { going: number; maybe: number; no: number };
  projects: Project[];
};

export type LeaderboardEntry = {
  project_id: string;
  title: string;
  owner_name: string;
  owner_avatar: string | null;
  image_url: string | null;
  score: number;
  vote_count: number;
  rank: number;
};

export type RsvpAvatar = { id: string; name: string; avatar_url: string | null };
export type RsvpsGrouped = { going: RsvpAvatar[]; maybe: RsvpAvatar[]; no: RsvpAvatar[] };

export type MyVoteOut = { project_id: string; score: number };
