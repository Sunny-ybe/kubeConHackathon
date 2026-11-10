// Small shared pieces for /card, /c/[id] and /people. No hooks, so server and client can both use them.
import Link from "next/link";
import { ArrowRightIcon, BackrowMark, ChevronLeftIcon } from "@/components/icons";
import type { Card } from "./types";

export function BackHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-16 items-center justify-between gap-3">
      <Link
        href="/"
        aria-label="Back to Backrow home"
        className="-ml-3 flex min-h-12 items-center gap-1.5 rounded-lg pr-2 pl-1.5 font-semibold tracking-tight"
      >
        <ChevronLeftIcon size={22} className="text-muted" />
        <BackrowMark />
        <span className="ml-1 text-[17px]">Backrow</span>
      </Link>
      {children}
    </header>
  );
}

const HOSTS: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(x|twitter)\.com$/, "X"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "YouTube"],
  [/(^|\.)threads\.(net|com)$/, "Threads"],
  [/(^|\.)bsky\.app$/, "Bluesky"],
  [/(^|\.)medium\.com$/, "Medium"],
  [/(^|\.)substack\.com$/, "Substack"],
];

/** "LinkedIn", "GitHub", … or "Website" for anything else; plus a short display of the URL. */
export function linkLabel(href: string): { label: string; display: string } {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "");
    const label = HOSTS.find(([re]) => re.test(host))?.[1] ?? "Website";
    const path = u.pathname.replace(/\/$/, "");
    return { label, display: host + (path.length > 1 ? path : "") };
  } catch {
    return { label: "Link", display: href };
  }
}

/** Renders an ES highlight fragment as text, with only <em>…</em> turned into bold. Nothing else is parsed. */
export function Highlight({ text }: { text: string }) {
  const parts = text.split(/<em>(.*?)<\/em>/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-fg">
            {p}
          </strong>
        ) : (
          p
        ),
      )}
    </>
  );
}

/** "Role at Company", skipping empty parts. */
export function roleLine(role: string, company: string): string {
  if (role && company) return `${role} at ${company}`;
  return role || company;
}

export function Initials({ name, size = "lg" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised font-semibold tracking-tight text-accent ${
        size === "lg" ? "size-16 text-2xl" : "size-11 text-base"
      }`}
    >
      {initials || "?"}
    </span>
  );
}

/** The card itself: who, what they're about, and their links as big labeled buttons. */
export function CardView({ card }: { card: Card }) {
  const line = roleLine(card.role, card.company);
  return (
    <article aria-labelledby={`card-${card.id}`} className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex items-center gap-4">
        <Initials name={card.name} />
        <div className="min-w-0">
          <h1 id={`card-${card.id}`} className="text-[28px] leading-tight font-semibold tracking-[-0.02em] break-words">
            {card.name}
          </h1>
          {line && <p className="mt-0.5 text-lg text-muted break-words">{line}</p>}
        </div>
      </div>
      {card.about && <p className="mt-6 text-lg leading-relaxed whitespace-pre-line break-words">{card.about}</p>}
      {card.links.length > 0 && (
        <ul className="mt-7 grid gap-2.5">
          {card.links.map((href) => {
            const { label, display } = linkLabel(href);
            return (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group flex min-h-16 items-center gap-4 rounded-2xl border border-line-strong bg-raised px-5 py-3 transition-[transform,border-color] hover:border-accent/50 active:scale-[0.99]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold">{label}</span>
                    <span className="block truncate text-sm text-muted">{display}</span>
                  </span>
                  <ArrowRightIcon className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
