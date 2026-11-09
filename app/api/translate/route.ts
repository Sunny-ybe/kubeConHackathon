import { NextResponse, type NextRequest } from "next/server";
import type { TranslateResponse } from "@/lib/types";
import { languageName, translateLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.slice(0, 4000) : "";
  const language = languageName(typeof body.lang === "string" ? body.lang : "");
  if (!language) return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  if (!text.trim()) return NextResponse.json<TranslateResponse>({ text: "" });
  try {
    return NextResponse.json<TranslateResponse>({ text: await translateLLM(text, language) });
  } catch (err) {
    console.error("translate failed", err);
    return NextResponse.json({ error: "Couldn't translate right now." }, { status: 500 });
  }
}
