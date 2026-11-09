import type { Metadata } from "next";
import { Suspense } from "react";
import SearchView from "./SearchView";

export const metadata: Metadata = { title: "Search · Backrow" };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
