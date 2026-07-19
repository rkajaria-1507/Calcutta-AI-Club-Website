import { NextRequest, NextResponse } from "next/server";
import { complete, parseJson, hasKey } from "@/lib/anthropic";

export const runtime = "nodejs";

type Answers = {
  name?: string;
  built?: string;
  tasteInto?: string;
  contrarian?: string;
  offer?: string;
  ask?: string;
  dream?: string;
};

type Profile = {
  line: string;
  epithet: string;
  industry: string;
  buildInto: string;
  tags: string[];
};

function fallback(a: Answers): Profile {
  return {
    line: `New on the wall: ${a.built?.slice(0, 90) || "story still being written"}.`,
    epithet: "Just walked in",
    industry: "Undeclared",
    buildInto: a.built?.split(" ").slice(0, 4).join(" ") || "Undeclared",
    tags: [],
  };
}

export async function POST(req: NextRequest) {
  const { answers } = (await req.json()) as { answers: Answers };

  if (!hasKey()) {
    return NextResponse.json({ ...fallback(answers), fallback: true });
  }

  const prompt = `You are the Calcutta AI Club's directory intelligence. A new member just answered the intake. Read them and write their card.

Name: ${answers.name}
Building now / dream build: ${answers.built}
Taste they'd defend: ${answers.tasteInto}
Contrarian AI belief: ${answers.contrarian}
Could teach: ${answers.offer}
Needs right now: ${answers.ask}
Dream collaboration: ${answers.dream}

Return ONLY JSON, no markdown fences:
{
  "line": "one sharp sentence a knowing friend would write to introduce them, present tense, specific, under 22 words",
  "epithet": "a 3-6 word nickname earned from their answers, no quotes",
  "industry": "their field in 1-3 words, inferred",
  "buildInto": "what they're building toward, 2-5 words",
  "tags": ["#3", "#to", "#five", "#lowercase", "#hashtags"]
}`;

  try {
    const text = await complete(prompt);
    const parsed = parseJson<Profile>(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ ...fallback(answers), fallback: true });
  }
}
