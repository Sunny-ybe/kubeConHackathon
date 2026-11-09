"use client";
// Renders the trip report markdown with [S#] chips, a sources list, and Copy / Email.
import { useState } from "react";
import type { Citation, ReportResponse } from "@/lib/types";
import CitedMarkdown from "@/components/ask/CitedMarkdown";
import SlideModal from "@/components/ask/SlideModal";
import { SlideThumb, slideMeta } from "@/components/ask/ui";

const MAILTO_BODY_MAX = 1800; // mail apps truncate or refuse very long mailto: links

/** Plain-text version for Copy / Email: the markdown plus what each [S#] points to. */
function plainText(r: ReportResponse): string {
  const sources = r.citations.map((c) => `[${c.label}] ${c.slide.title || "Untitled slide"} (${slideMeta(c.slide)})`);
  return `${r.markdown}\n\nSources\n${sources.join("\n")}\n`;
}

export default function TripReport({ report }: { report: ReportResponse }) {
  const [open, setOpen] = useState<Citation | null>(null);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(plainText(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const body = plainText(report);
  const mailto = `mailto:?subject=${encodeURIComponent("My conference trip report")}&body=${encodeURIComponent(
    body.length > MAILTO_BODY_MAX ? body.slice(0, MAILTO_BODY_MAX) + "…" : body,
  )}`;
  const btn =
    "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong px-4 text-base font-medium hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none";

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="text-[17px] leading-relaxed text-fg">
        <CitedMarkdown markdown={report.markdown} citations={report.citations} onOpen={setOpen} />
      </div>

      <div className="mt-6 flex gap-2 border-t border-line pt-5">
        <button type="button" onClick={copy} className={btn}>
          {copied ? "Copied" : "Copy"}
        </button>
        <a href={mailto} className={btn}>
          Email
        </a>
      </div>

      {report.citations.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Sources · {report.citations.filter((c) => !c.slide.mine).length} from the room
          </h3>
          <ul className="space-y-1">
            {report.citations.map((c) => (
              <li key={c.label}>
                <button
                  type="button"
                  onClick={() => setOpen(c)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg p-1.5 text-left hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-accent">{c.label}</span>
                  <SlideThumb slide={c.slide} size="sm" className="hidden w-20 shrink-0 rounded-md sm:block" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">{c.slide.title || "Untitled slide"}</span>
                    <span className="block truncate text-sm text-muted">{slideMeta(c.slide)}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.slide.mine ? "bg-white/[0.06] text-muted" : "bg-accent/15 text-accent"
                    }`}
                  >
                    {c.slide.mine ? "You" : "Room"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <SlideModal slide={open?.slide ?? null} label={open?.label} onClose={() => setOpen(null)} />
    </article>
  );
}
