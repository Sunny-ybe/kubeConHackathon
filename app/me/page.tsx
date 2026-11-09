import type { Metadata } from "next";
import MeView from "./MeView";

export const metadata: Metadata = { title: "My slides · Backrow" };

export default function MePage() {
  return <MeView />;
}
