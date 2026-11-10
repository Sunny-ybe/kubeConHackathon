import Link from "next/link";
import { getCard } from "@/app/people/actions";
import { BackHeader, CardView } from "@/app/people/ui";
import { UsersIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  return { title: card ? `${card.name} · Backrow` : "Card not found · Backrow" };
}

/** A shared people card, opened from its QR code. */
export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 sm:px-8">
      <BackHeader />
      <main className="flex-1 pt-6 pb-16 sm:pt-12">
        {card ? (
          <div className="animate-rise">
            <CardView card={card} />
          </div>
        ) : (
          <div className="animate-rise rounded-3xl border border-line bg-surface p-7 sm:p-9">
            <p className="text-[13px] font-medium tracking-wider text-muted uppercase">Card not found</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">This card isn&apos;t here.</h1>
            <p className="mt-3 text-lg leading-relaxed text-muted">
              It may have been removed, or the link was cut short. Ask them to show you their QR again.
            </p>
            <Link
              href="/people"
              className="mt-7 inline-flex h-14 items-center gap-3 rounded-2xl border border-line-strong pr-5 pl-4 text-[17px] font-semibold transition-colors hover:bg-raised"
            >
              <UsersIcon size={22} className="text-muted" />
              See who&apos;s here
            </Link>
          </div>
        )}
        <p className="mt-6 text-center text-[15px] text-muted">
          <Link href="/card" className="font-medium text-accent underline-offset-2 hover:underline">
            Make your own card
          </Link>
        </p>
      </main>
    </div>
  );
}
