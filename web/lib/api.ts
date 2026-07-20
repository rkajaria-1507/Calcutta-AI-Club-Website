const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "cac_token";

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
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
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

// ---------- Types (mirror api/app/schemas/) ----------

export type ApiMember = {
  id: string;
  name: string;
  built: string | null;
  taste: string | null;
  contrarian: string | null;
  offer: string | null;
  ask: string | null;
  dream: string | null;
  socials: Record<string, string>;
  field: string | null;
  build_into: string | null;
  line: string | null;
  epithet: string | null;
  tags: string[];
  created_at: string;
};

export type ApiAuthorSummary = { id: string; name: string };

export type ApiPitch = {
  id: string;
  author: ApiAuthorSummary;
  title: string;
  idea: string;
  ask: string | null;
  suggested: { name: string; member_id?: string; reason: string }[];
  comment_count: number;
  created_at: string;
};

export type ApiComment = {
  id: string;
  author: ApiAuthorSummary;
  body: string;
  created_at: string;
};

export type ApiDream = { dream: string; members: number; who: string[] };

export type ApiSession = {
  id: string;
  title: string;
  topic: string | null;
  venue: string | null;
  starts_at: string;
};

export type ApiRsvpMember = { id: string; name: string; epithet: string | null };

export type ApiRsvpsGrouped = {
  going: ApiRsvpMember[];
  maybe: ApiRsvpMember[];
  no: ApiRsvpMember[];
};
