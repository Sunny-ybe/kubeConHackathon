import PeopleView from "./PeopleView";
import { cardStats, searchCards } from "./actions";
import type { Card, CardStats } from "./types";

export const dynamic = "force-dynamic";
export const metadata = { title: "People · Backrow" };

export default async function Page() {
  let stats: CardStats | null = null;
  let cards: Card[] | null = null;
  try {
    [stats, cards] = await Promise.all([cardStats(), searchCards("")]);
  } catch {
    // PeopleView shows the error state and keeps retrying the stats.
  }
  return <PeopleView initialStats={stats} initialCards={cards} />;
}
