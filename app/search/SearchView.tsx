"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SearchHit, SearchResponse, Slide } from "@/lib/types";
import { deviceId } from "@/lib/device";
import AskPanel from "@/components/ask/AskPanel";
import SlideModal from "@/components/ask/SlideModal";
import { PageHeader, Shimmer, SlideThumb, slideMeta } from "@/components/ask/ui";

const SUGGESTIONS = ["failover", "switching to a backup cluster", "diagram with three clusters", "etcd"];

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; hits: SearchHit[] }
  | { kind: "error" };

/** Elasticsearch highlight fragment with <em> rendered bold, without trusting it as HTML. */
function Highlight({ fragment }: { fragment: string }) {
  // Splitting on a capture group puts the <em> contents at the odd indexes.
  return (
    <>
      {fragment
        .replace(/\s*\n\s*/g, " ")
        .split(/<em>(.*?)<\/em>/)
        .map((part, i) =>
          i % 2 ? (
            <strong key={i} className="font-semibold text-fg">
              {part}
            </strong>
          ) : (
            part
          ),
        )}
    </>
  );
}

function ResultRow({ hit, onOpen }: { hit: SearchHit; onOpen: () => void }) {
  const s = hit.slide;
  const fallback = s.text.replace(/\s*\n\s*/g, " ").slice(0, 140);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-accent sm:gap-4"
      >
        <SlideThumb slide={s} className="w-32 shrink-0 self-start sm:w-44" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span className="line-clamp-2 text-lg font-semibold leading-snug text-fg">
              {s.title || "Untitled slide"}
            </span>
            {s.mine && (
              <span className="mt-1 shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-muted">
                You
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted">{slideMeta(s)}</span>
          <span className="mt-1.5 line-clamp-3 text-[15px] leading-snug text-muted">
            {hit.highlights[0] ? <Highlight fragment={hit.highlights[0]} /> : fallback}
          </span>
        </span>
      </button>
    </li>
  );
}

function ResultSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex gap-3 p-2 sm:gap-4">
          <Shimmer className="aspect-video w-32 shrink-0 rounded-lg sm:w-44" />
          <div className="flex-1 space-y-2.5 pt-1">
            <Shimmer className="h-5 w-4/5" />
            <Shimmer className="h-3.5 w-3/5" />
            <Shimmer className="h-3.5 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const mine = params.get("mine") === "1";
  const tab = params.get("tab") === "ask" ? "ask" : "search";

  const [input, setInput] = useState(q);
  const [result, setResult] = useState<{ key: string; hits: SearchHit[] | null } | null>(null);
  const [open, setOpen] = useState<Slide | null>(null);
  const [retry, setRetry] = useState(0);

  function go(next: { q?: string; mine?: boolean; tab?: "search" | "ask" }) {
    const sp = new URLSearchParams();
    const nq = (next.q ?? q).trim();
    if (nq) sp.set("q", nq);
    if (next.mine ?? mine) sp.set("mine", "1");
    if ((next.tab ?? tab) === "ask") sp.set("tab", "ask");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Search as you type, debounced; the URL is the source of truth so results are shareable.
  useEffect(() => {
    if (input.trim() === q) return;
    const t = setTimeout(() => go({ q: input }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // One fetch per (query, filter, retry). Loading is derived: a result for an older key.
  const key = `${q}|${mine}|${retry}`;
  useEffect(() => {
    if (!q) return;
    const ctrl = new AbortController();
    const sp = new URLSearchParams({ q, device_id: deviceId() });
    if (mine) sp.set("mine", "1");
    fetch(`/api/search?${sp}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<SearchResponse>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => setResult({ key, hits: data.hits }))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setResult({ key, hits: null });
      });
    return () => ctrl.abort();
  }, [q, mine, key]);

  const state: State = !q
    ? { kind: "idle" }
    : result?.key !== key
      ? { kind: "loading" }
      : result.hits
        ? { kind: "done", hits: result.hits }
        : { kind: "error" };

  const chip = (active: boolean) =>
    `h-12 rounded-full px-5 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
      active ? "bg-fg text-on-accent" : "border border-line-strong text-muted hover:text-fg"
    }`;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16 text-fg sm:px-6">
      <PageHeader current="search" />

      <div className="mt-4 mb-5 flex items-end justify-between gap-4">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight sm:text-3xl">{tab === "ask" ? "Ask the slides" : "Search slides"}</h1>
        <div role="tablist" aria-label="Mode" className="flex rounded-xl border border-line bg-surface p-1">
          {(["search", "ask"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => go({ tab: t })}
              className={`h-10 min-w-16 rounded-lg px-4 text-base font-medium capitalize focus-visible:outline-2 focus-visible:outline-accent ${
                tab === t ? "bg-white/[0.1] text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "ask" ? (
        <AskPanel room="" />
      ) : (
        <>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go({ q: input });
            }}
          >
            <label htmlFor="search-input" className="sr-only">
              Search slides
            </label>
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                id="search-input"
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search every slide snapped today"
                enterKeyHint="search"
                autoComplete="off"
                className="h-14 w-full rounded-xl border border-line bg-surface pr-4 pl-12 text-lg placeholder:text-muted/70 focus-visible:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/40"
              />
            </div>
          </form>

          <div className="mt-3 flex gap-2" role="group" aria-label="Filter">
            <button type="button" aria-pressed={!mine} onClick={() => go({ mine: false })} className={chip(!mine)}>
              All
            </button>
            <button type="button" aria-pressed={mine} onClick={() => go({ mine: true })} className={chip(mine)}>
              Mine
            </button>
          </div>

          <div className="mt-6" aria-live="polite" aria-busy={state.kind === "loading"}>
            {state.kind === "idle" && (
              <div>
                <p className="text-base text-muted">Search by words on the slide, or describe what you remember.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setInput(s);
                        go({ q: s });
                      }}
                      className="h-12 rounded-full border border-line bg-surface px-4 text-base text-fg hover:border-line-strong focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {state.kind === "loading" && <ResultSkeleton />}
            {state.kind === "error" && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
                <p className="text-base text-muted">Search is unavailable right now.</p>
                <button
                  type="button"
                  onClick={() => setRetry((n) => n + 1)}
                  className="h-12 shrink-0 rounded-lg border border-line-strong px-4 text-base font-medium hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Try again
                </button>
              </div>
            )}
            {state.kind === "done" && state.hits.length === 0 && (
              <p className="text-base text-muted">
                {mine ? "None of your slides match that yet." : "No slides match that yet. Try other words."}
              </p>
            )}
            {state.kind === "done" && state.hits.length > 0 && (
              <>
                <p className="sr-only">
                  {state.hits.length} {state.hits.length === 1 ? "slide" : "slides"} found
                </p>
                <ul className="-mx-2 space-y-1">
                  {state.hits.map((h) => (
                    <ResultRow key={h.slide.slide_id} hit={h} onOpen={() => setOpen(h.slide)} />
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}

      <SlideModal slide={open} onClose={() => setOpen(null)} />
    </main>
  );
}
