"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { createCard } from "@/app/people/actions";
import { BackHeader, CardView } from "@/app/people/ui";
import type { Card } from "@/app/people/types";
import { ArrowRightIcon, CloseIcon, LockIcon, PlusIcon, UsersIcon } from "@/components/icons";

const ABOUT_MAX = 500;
const MAX_LINKS = 5;

const input =
  "h-14 w-full rounded-2xl border border-line-strong bg-surface px-4 text-[18px] placeholder:text-muted/60 focus-visible:border-accent/60 disabled:opacity-60";
const label = "mb-2 block text-[15px] font-medium";

/** Turns "github.com/me" into "https://github.com/me". Returns "" for anything we won't store. */
function normalizeLink(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const withScheme = /^https?:\/\//i.test(s) ? s.replace(/^http:\/\//i, "https://") : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes(".") ? u.href : "";
  } catch {
    return "";
  }
}

function cardUrl(id: string): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const here = window.location;
  const envIsLocal = !env || /\/\/(localhost|127\.0\.0\.1)(:|$)/.test(env);
  // A localhost APP_URL is only right on that exact dev server; otherwise use where we are.
  const base = envIsLocal ? here.origin : env;
  return `${base}/c/${id}`;
}

export default function CardForm() {
  const [fields, setFields] = useState({ name: "", company: "", role: "", about: "" });
  const [links, setLinks] = useState<string[]>([""]);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [done, setDone] = useState<{ card: Card; url: string; qr: string } | null>(null);

  useEffect(() => {
    if (done) window.scrollTo({ top: 0 });
  }, [done]);

  const set = (k: keyof typeof fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status.kind === "saving") return;
    const clean = links.map(normalizeLink).filter(Boolean);
    const bad = links.filter((l) => l.trim() && !normalizeLink(l));
    if (bad.length) {
      setStatus({ kind: "error", message: `“${bad[0]}” doesn't look like a link.` });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      const res = await createCard({ ...fields, links: clean });
      if ("error" in res) {
        setStatus({ kind: "error", message: res.error });
        return;
      }
      const url = cardUrl(res.id);
      const qr = await QRCode.toDataURL(url, { width: 512, margin: 1 });
      const t = (s: string) => s.trim();
      setDone({
        card: {
          id: res.id,
          name: t(fields.name),
          company: t(fields.company),
          role: t(fields.role),
          about: t(fields.about),
          links: clean,
          created_at: new Date().toISOString(),
        },
        url,
        qr,
      });
      setStatus({ kind: "idle" });
    } catch {
      setStatus({ kind: "error", message: "Couldn't save your card. Check your connection and try again." });
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 sm:px-8">
        <BackHeader />
        <main className="flex-1 pt-6 pb-16 sm:pt-12">
          <p className="animate-rise text-[13px] font-medium tracking-wider text-success uppercase">Your card is live</p>
          <section aria-label="Your QR code" className="animate-rise mt-3 rounded-3xl bg-white p-5 text-black">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
            <img
              src={done.qr}
              alt={`QR code that opens ${done.card.name}'s card`}
              width={512}
              height={512}
              className="mx-auto aspect-square w-full max-w-[320px] [image-rendering:pixelated]"
            />
            <p className="mt-3 text-center text-[15px] text-black/60">Let people scan this to open your card.</p>
          </section>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <a
              href={done.url}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-line-strong text-[16px] font-semibold transition-colors hover:bg-surface"
            >
              Open card
              <ArrowRightIcon size={18} />
            </a>
            <Link
              href="/people"
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent text-[16px] font-semibold text-on-accent transition-transform active:scale-[0.98]"
            >
              <UsersIcon size={20} />
              See who&apos;s here
            </Link>
          </div>
          <div className="animate-rise mt-8 [animation-delay:60ms]">
            <CardView card={done.card} />
          </div>
        </main>
      </div>
    );
  }

  const saving = status.kind === "saving";
  const aboutLeft = ABOUT_MAX - fields.about.length;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 sm:px-8">
      <BackHeader />
      <main className="flex-1 pt-6 pb-16 sm:pt-12">
        <form onSubmit={onSubmit} className="animate-rise" noValidate>
          <p className="text-[13px] font-medium tracking-wider text-muted uppercase">People here</p>
          <h1 className="mt-2 text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl">Make your card</h1>
          <p className="mt-3 text-lg text-muted">Share it with a QR code. Everything but your name is optional.</p>

          <fieldset disabled={saving} className="mt-8 grid gap-5">
            <div>
              <label htmlFor="name" className={label}>
                Name
              </label>
              <input id="name" required value={fields.name} onChange={set("name")} maxLength={80} autoComplete="name" autoCapitalize="words" className={input} />
            </div>
            <div className="grid gap-5 min-[480px]:grid-cols-2">
              <div>
                <label htmlFor="company" className={label}>
                  Company
                </label>
                <input id="company" value={fields.company} onChange={set("company")} maxLength={80} autoComplete="organization" className={input} />
              </div>
              <div>
                <label htmlFor="role" className={label}>
                  Role
                </label>
                <input id="role" value={fields.role} onChange={set("role")} maxLength={80} autoComplete="organization-title" className={input} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="about" className={label}>
                  About
                </label>
                <span id="about-count" className={`text-sm tabular-nums ${aboutLeft < 50 ? "text-accent" : "text-muted"}`}>
                  {aboutLeft}
                </span>
              </div>
              <textarea
                id="about"
                value={fields.about}
                onChange={set("about")}
                maxLength={ABOUT_MAX}
                rows={4}
                aria-describedby="about-count"
                placeholder="What you're working on, looking for, or can help with"
                className="w-full resize-y rounded-2xl border border-line-strong bg-surface px-4 py-3.5 text-[18px] leading-relaxed placeholder:text-muted/60 focus-visible:border-accent/60 disabled:opacity-60"
              />
            </div>
            <div>
              <p id="links-label" className={label}>
                Links
              </p>
              <ul aria-labelledby="links-label" className="grid gap-2.5">
                {links.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <input
                      value={l}
                      onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? e.target.value : x)))}
                      aria-label={`Link ${i + 1}`}
                      type="url"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      maxLength={300}
                      placeholder="LinkedIn, GitHub, Instagram, website…"
                      className={input}
                    />
                    {links.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}
                        aria-label={`Remove link ${i + 1}`}
                        className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line text-muted transition-colors hover:text-fg"
                      >
                        <CloseIcon />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {links.length < MAX_LINKS && (
                <button
                  type="button"
                  onClick={() => setLinks((ls) => [...ls, ""])}
                  className="mt-2 -ml-2 flex min-h-12 items-center gap-2 rounded-lg px-2 text-[15px] font-medium text-accent"
                >
                  <PlusIcon size={18} />
                  Add another link
                </button>
              )}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={saving || !fields.name.trim()}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-accent text-[17px] font-semibold text-on-accent transition-[transform,opacity] active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Making your card…" : "Make my card"}
            {!saving && <ArrowRightIcon size={20} />}
          </button>

          <p aria-live="polite" className="mt-3 min-h-6 text-[15px] text-accent">
            {status.kind === "error" ? status.message : ""}
          </p>

          <p className="mt-2 flex gap-2.5 text-[15px] leading-relaxed text-muted">
            <LockIcon size={18} className="mt-0.5 shrink-0" />
            Only what you enter is shared with people at this event.
          </p>
        </form>
      </main>
    </div>
  );
}
