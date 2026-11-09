"use client";
// Ask: a question answered only from slides, with [S#] chips that open the cited slide.
// The room page (Agent B) renders <AskPanel room={...} talkId={...} />; /search passes room="".
import { useEffect, useRef, useState } from "react";
import type { AskResponse, Citation } from "@/lib/types";
import { deviceId } from "@/lib/device";
import CitedMarkdown from "./CitedMarkdown";
import SlideModal from "./SlideModal";
import { Shimmer, SlideThumb, slideMeta } from "./ui";

export type AskPanelProps = { room: string; talkId?: string };

const NO_EVIDENCE = "No slide covers that yet.";
const LOADING_LINES = ["Searching the slides…", "Reading what was said…", "Writing a cited answer…"];

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; q: string; res: AskResponse }
  | { kind: "error"; message: string };

export default function AskPanel({ room, talkId }: AskPanelProps) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [line, setLine] = useState(0);
  const [open, setOpen] = useState<Citation | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.kind !== "loading") return;
    const t = setInterval(() => setLine((n) => (n + 1) % LOADING_LINES.length), 1600);
    return () => clearInterval(t);
  }, [state.kind]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (!question || state.kind === "loading") return;
    setLine(0);
    setState({ kind: "loading" });
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: question, device_id: deviceId(), room: room || undefined, talk_id: talkId }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data || typeof data.answer !== "string") throw new Error(data?.error);
      setState({ kind: "done", q: question, res: data });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message || "Couldn't answer right now. Try again." });
    }
  }

  const noEvidence = state.kind === "done" && (state.res.answer === NO_EVIDENCE || !state.res.citations.length);

  return (
    <section className="text-[#F4F4F5]" aria-label="Ask the slides">
      <form onSubmit={ask} className="flex gap-2">
        <label htmlFor="ask-input" className="sr-only">
          Ask a question about the slides
        </label>
        <input
          id="ask-input"
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What did they say about failover?"
          enterKeyHint="send"
          autoComplete="off"
          className="h-14 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#16161A] px-4 text-lg placeholder:text-[#A1A1AA]/70 focus-visible:border-[#FFB020]/60 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#FFB020]/40"
        />
        <button
          type="submit"
          disabled={!q.trim() || state.kind === "loading"}
          className="h-14 shrink-0 rounded-xl bg-[#FFB020] px-5 text-lg font-semibold text-[#0A0A0C] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020] disabled:opacity-40"
        >
          Ask
        </button>
      </form>

      <div aria-live="polite" aria-busy={state.kind === "loading"} className="mt-4">
        {state.kind === "idle" && (
          <p className="text-base text-[#A1A1AA]">Answers come only from slides people snapped, with sources.</p>
        )}

        {state.kind === "loading" && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#16161A] p-5">
            <p className="mb-4 text-base text-[#A1A1AA]">{LOADING_LINES[line]}</p>
            <div className="space-y-3">
              <Shimmer className="h-4 w-full" />
              <Shimmer className="h-4 w-11/12" />
              <Shimmer className="h-4 w-4/6" />
            </div>
          </div>
        )}

        {state.kind === "error" && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#16161A] p-5">
            <p className="text-base text-[#A1A1AA]">{state.message}</p>
            <button
              type="button"
              onClick={() => inputRef.current?.form?.requestSubmit()}
              className="h-12 shrink-0 rounded-lg border border-white/[0.12] px-4 text-base font-medium hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#FFB020]"
            >
              Try again
            </button>
          </div>
        )}

        {state.kind === "done" && noEvidence && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#16161A] p-5">
            <p className="text-lg font-medium">{NO_EVIDENCE}</p>
            <p className="mt-1 text-base text-[#A1A1AA]">Try other words, or snap the slide when it comes up.</p>
          </div>
        )}

        {state.kind === "done" && !noEvidence && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#16161A] p-5">
            <p className="mb-2 text-sm text-[#A1A1AA]">{state.q}</p>
            <div className="text-lg leading-relaxed">
              <CitedMarkdown markdown={state.res.answer} citations={state.res.citations} onOpen={setOpen} />
            </div>
            <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">Sources</h3>
            <ul className="space-y-1">
              {state.res.citations.map((c) => (
                <li key={c.label}>
                  <button
                    type="button"
                    onClick={() => setOpen(c)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg p-1.5 text-left hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-[#FFB020]"
                  >
                    <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-[#FFB020]">{c.label}</span>
                    <SlideThumb slide={c.slide} size="sm" className="w-20 shrink-0 rounded-md" />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium">{c.slide.title || "Untitled slide"}</span>
                      <span className="block truncate text-sm text-[#A1A1AA]">{slideMeta(c.slide)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <SlideModal slide={open?.slide ?? null} label={open?.label} onClose={() => setOpen(null)} />
    </section>
  );
}
