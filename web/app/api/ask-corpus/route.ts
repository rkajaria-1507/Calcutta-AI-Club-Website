import { NextRequest, NextResponse } from "next/server";
import { complete, hasKey } from "@/lib/anthropic";

export const runtime = "nodejs";

type Member = {
  name: string;
  industry?: string;
  built?: string;
  buildInto?: string;
  tasteInto?: string;
  ask?: string;
  offer?: string;
  line?: string;
  tags?: string[];
};

function fallback(question: string, members: Member[]): string {
  const q = question.toLowerCase();
  const hits = members.filter((m) =>
    [m.industry, m.built, m.buildInto, m.tasteInto, m.offer, ...(m.tags || [])]
      .join(" ")
      .toLowerCase()
      .split(/[^a-z#]+/)
      .some((w) => w.length > 3 && q.includes(w))
  );
  if (!hits.length) return "Nobody on the wall matches that yet. Try a broader phrasing, or a tag.";
  return `Looks like ${hits.slice(0, 3).map((m) => m.name).join(", ")} — ${hits[0].line ?? ""}`;
}

export async function POST(req: NextRequest) {
  const { question, members } = (await req.json()) as { question: string; members: Member[] };

  if (!hasKey()) {
    return NextResponse.json({ answer: fallback(question, members), fallback: true });
  }

  const directory = members.map((m) => ({
    name: m.name,
    field: m.industry,
    built: m.built,
    building: m.buildInto,
    taste: m.tasteInto,
    needs: m.ask,
    offers: m.offer,
    tags: m.tags,
  }));

  const prompt = `You are the Calcutta AI Club directory, answering questions about who's in the room. Here is the full member corpus:\n\n${JSON.stringify(
    directory,
    null,
    2
  )}\n\nQuestion: "${question}"\n\nAnswer conversationally and briefly, naming specific members and why they fit. If nobody fits, say so plainly. Never invent members not in the corpus. Write like a knowing host making introductions, not a search engine. Max 4 sentences.`;

  try {
    const answer = await complete(prompt);
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ answer: fallback(question, members), fallback: true });
  }
}
