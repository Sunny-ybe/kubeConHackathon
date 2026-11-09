"use client";
// Markdown from Ask or the trip report, with every [S#] rendered as a chip that opens its slide.
import Markdown from "react-markdown";
import type { Citation } from "@/lib/types";
import { CitationChip } from "./ui";

export default function CitedMarkdown({
  markdown,
  citations,
  onOpen,
}: {
  markdown: string;
  citations: Citation[];
  onOpen: (c: Citation) => void;
}) {
  const byLabel = new Map(citations.map((c) => [c.label, c]));
  // Turn [S3] into a link the `a` override below swaps for a chip.
  const md = markdown.replace(/\[(S\d+)\](?!\()/g, (m, label: string) =>
    byLabel.has(label) ? `[${label}](#cite-${label})` : m,
  );
  const heading = ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-7 mb-2 text-xl font-semibold leading-snug first:mt-0">{children}</h3>
  );
  return (
    <Markdown
      components={{
        h1: heading,
        h2: heading,
        h3: heading,
        h4: heading,
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-2 pl-5 marker:text-[#A1A1AA]">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-2 pl-5 marker:text-[#A1A1AA]">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        code: ({ children }) => <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
        a: ({ href, children }) => {
          const c = href?.startsWith("#cite-") ? byLabel.get(href.slice(6)) : undefined;
          if (c) return <CitationChip label={c.label} slide={c.slide} onOpen={() => onOpen(c)} />;
          return (
            <a href={href} target="_blank" rel="noreferrer" className="text-[#FFB020] underline underline-offset-2">
              {children}
            </a>
          );
        },
      }}
    >
      {md}
    </Markdown>
  );
}
