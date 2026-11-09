// Server-only text-model calls for Ask, trip report and translate (SPEC §7.2–7.4).
// Each one is prompt in, string out, over claudeText().
import type { Citation, Slide } from "./types";
import { formatTime, type LangCode } from "./config";
import { claudeText } from "./server/anthropic";
import { span } from "./server/trace";

export const NO_EVIDENCE_ANSWER = "No slide covers that yet.";

const LANGUAGE_NAMES: Record<LangCode, string> = {
  es: "Spanish",
  hi: "Hindi",
  zh: "Simplified Chinese",
  fr: "French",
  pt: "Brazilian Portuguese",
  ja: "Japanese",
};

export function languageName(code: string): string | undefined {
  return LANGUAGE_NAMES[code as LangCode];
}

/** One slide in the `[S1] (Talk: …, 2:41 PM) Title: …` block format the prompts use. */
export function slideBlock(label: string, s: Slide, withTalk = true): string {
  const head = withTalk ? `(Talk: ${s.talk_title || "Open session"}, ${formatTime(s.taken_at)})` : `(${formatTime(s.taken_at)})`;
  const lines = [`[${label}] ${head} Title: ${s.title || "(untitled)"}`, `Text: ${s.text || "(none)"}`];
  if (s.alt_text) lines.push(`Diagram: ${s.alt_text}`);
  return lines.join("\n");
}

/** Rewrites "[S1, S3]" as "[S1][S3]", then returns the cited slides in order of first use. */
export function extractCitations(text: string, labeled: Citation[]): { text: string; citations: Citation[] } {
  const normalized = text.replace(/\[\s*(S\d+(?:\s*[,;]\s*S\d+)+)\s*\]/g, (_, list: string) =>
    list
      .split(/[,;]/)
      .map((l) => `[${l.trim()}]`)
      .join(""),
  );
  const byLabel = new Map(labeled.map((c) => [c.label, c]));
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const m of normalized.matchAll(/\[(S\d+)\]/g)) {
    const c = byLabel.get(m[1]);
    if (c && !seen.has(c.label)) {
      seen.add(c.label);
      citations.push(c);
    }
  }
  return { text: normalized, citations };
}

export function askLLM(q: string, labeled: Citation[]): Promise<string> {
  const prompt = `Answer the question using only the slides below. Cite slides inline like [S2].
If the slides do not contain the answer, reply exactly: NO_EVIDENCE
Keep it under 120 words.

Question: ${q}

Slides:
${labeled.map((c) => slideBlock(c.label, c.slide)).join("\n\n")}`;
  return span("ask.llm", () => claudeText({ prompt, maxTokens: 600 }), { slides: labeled.length });
}

/** `talks` is the slide block text grouped under one "## Talk" heading per talk. */
export function reportLLM(talks: string, slideCount: number): Promise<string> {
  const prompt = `Write a conference trip report from these slides, in Markdown.
For each talk: a "### {talk title}" heading and 2-4 bullets of key points, each ending
with citations like [S3]. Then "### Top takeaways" (3 bullets) and "### Worth following up"
(up to 3 bullets: things to watch, read, or try). Use only the slides; never invent facts.
Under 350 words.

${talks}`;
  return span("report.llm", () => claudeText({ prompt, maxTokens: 1500, timeoutMs: 55_000 }), { slides: slideCount });
}

export function translateLLM(text: string, language: string): Promise<string> {
  const prompt = `Translate the following slide text into ${language}. Keep technical terms, product names,
commands, and code unchanged. Return only the translation.

${text}`;
  return span("translate.llm", () => claudeText({ prompt, maxTokens: 1500 }), { language });
}
