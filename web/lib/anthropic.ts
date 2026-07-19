// Server-only Anthropic helper. The API key never reaches the browser.
// All three AI surfaces (profile generation, pitch matching, corpus Q&A)
// proxy through here. If ANTHROPIC_API_KEY is unset or the call fails, the
// caller falls back to deterministic local logic so the demo never stalls.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export function hasKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Call Claude with a single user prompt, return the concatenated text. */
export async function complete(prompt: string, maxTokens = 1000): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`anthropic ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n")
    .trim();
}

/** Parse a JSON blob out of a model response, tolerating ```json fences. */
export function parseJson<T>(text: string): T {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as T;
}
