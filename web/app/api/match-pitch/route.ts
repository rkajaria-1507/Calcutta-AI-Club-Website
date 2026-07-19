import { NextRequest, NextResponse } from "next/server";
import { complete, parseJson, hasKey } from "@/lib/anthropic";

export const runtime = "nodejs";

type Member = {
  name: string;
  industry?: string;
  built?: string;
  buildInto?: string;
  offer?: string;
  ask?: string;
};

type Pitch = { title: string; idea: string; ask: string; author?: string };
type Suggestion = { name: string; reason: string };

function fallback(pitch: Pitch, members: Member[]): Suggestion[] {
  const text = (pitch.title + " " + pitch.idea + " " + pitch.ask).toLowerCase();
  const scored = members
    .filter((m) => m.name !== pitch.author)
    .map((m) => {
      const hay = (
        (m.built ?? "") + " " + (m.buildInto ?? "") + " " + (m.offer ?? "") + " " + (m.industry ?? "")
      ).toLowerCase();
      const words = hay.split(/[^a-z]+/).filter((w) => w.length > 4);
      let score = 0;
      words.forEach((w) => {
        if (text.includes(w)) score++;
      });
      return { m, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map(({ m }) => ({
    name: m.name,
    reason: `Offers: ${(m.offer ?? "relevant help").toLowerCase()}`,
  }));
}

export async function POST(req: NextRequest) {
  const { pitch, members } = (await req.json()) as { pitch: Pitch; members: Member[] };

  if (!hasKey()) {
    return NextResponse.json({ suggested: fallback(pitch, members), fallback: true });
  }

  const directory = members.map((m) => ({
    name: m.name,
    industry: m.industry,
    built: m.built,
    into: m.buildInto,
    offers: m.offer,
    needs: m.ask,
  }));

  const prompt = `You are the matching engine for the Calcutta AI Club. A member posted this pitch:
Title: ${pitch.title}
Idea: ${pitch.idea}
Ask: ${pitch.ask}

Club directory:
${JSON.stringify(directory)}

Pick the 2 best-matched members (never the pitch author "${pitch.author ?? ""}") and give a sharp one-line reason each, written like a knowing introduction, max 14 words. Respond ONLY with JSON, no markdown fences: [{"name": "...", "reason": "..."}]`;

  try {
    const text = await complete(prompt);
    const parsed = parseJson<Suggestion[]>(text);
    if (Array.isArray(parsed) && parsed.length) {
      return NextResponse.json({ suggested: parsed.slice(0, 3) });
    }
    return NextResponse.json({ suggested: fallback(pitch, members), fallback: true });
  } catch {
    return NextResponse.json({ suggested: fallback(pitch, members), fallback: true });
  }
}
