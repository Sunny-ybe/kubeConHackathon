// Sample API responses so UI agents can build before the real routes exist.
// Used when NEXT_PUBLIC_USE_FIXTURES=1. FROZEN (edit only through the human).
import type {
  AskResponse,
  FeedResponse,
  LiveResponse,
  MeResponse,
  ReportResponse,
  RoomResponse,
  SearchResponse,
  Slide,
  SnapResponse,
  Talk,
  TranslateResponse,
} from "./types";

export const talkFixture: Talk = {
  talk_id: "demo-live",
  room: "demo",
  room_name: "Demo Stage",
  title: "Backrow live demo",
  speakers: "Team Backrow",
  abstract: "Snap a slide, keep the talk.",
  start: "2026-11-09T09:00:00-07:00",
  end: "2026-11-09T19:00:00-07:00",
};

function slide(n: number, over: Partial<Slide>): Slide {
  return {
    slide_id: `fx-${n}`,
    shared: true,
    is_slide: true,
    room: "demo",
    talk_id: "demo-live",
    talk_title: "Backrow live demo",
    taken_at: new Date(Date.now() - n * 60_000).toISOString(),
    title: "",
    text: "",
    alt_text: "",
    topics: [],
    cluster_id: `c_fx${n}`,
    snaps: 1,
    mine: false,
    thumb_url: "", // empty on purpose: UI must fall back to a text tile
    image_url: "",
    ...over,
  };
}

export const slidesFixture: Slide[] = [
  slide(1, {
    title: "Snap this slide",
    text: "Snap this slide\nBackrow: snap a slide, keep the talk",
    alt_text: "A large QR code linking to the Backrow demo room.",
    topics: ["backrow", "demo"],
    snaps: 14,
    mine: true,
  }),
  slide(2, {
    title: "Multi-cluster failover",
    text: "Active-passive across 3 clusters\nHealth checks every 5s\nFailover in under 30s",
    alt_text:
      "Diagram of three Kubernetes clusters. Traffic moves from the primary cluster in us-west to a standby in us-east when health checks fail.",
    topics: ["failover", "multi-cluster", "kubernetes"],
    snaps: 6,
  }),
  slide(3, {
    title: "Hybrid search = keywords + meaning",
    text: "Exact terms: etcd, Karpenter, CrashLoopBackOff\nMeaning: 'my nodes keep restarting'\nFuse both with RRF",
    alt_text: "",
    topics: ["search", "elasticsearch", "rrf"],
    snaps: 3,
  }),
];

export const roomFixture: RoomResponse = {
  room: "demo",
  room_name: "Demo Stage",
  talk: talkFixture,
  hosted: false,
  host: false,
};

export const feedFixture: FeedResponse = { room: "demo", talk: talkFixture, slides: slidesFixture };

export const snapFixture: SnapResponse = {
  ok: true,
  slide: slidesFixture[0],
  talk: talkFixture,
  cluster_size: 14,
};

export const searchFixture: SearchResponse = {
  query: "failover",
  hits: [
    {
      slide: slidesFixture[1],
      highlights: ["Active-passive across 3 clusters", "Health checks every 5s, <em>failover</em> in under 30s"],
    },
  ],
};

export const askFixture: AskResponse = {
  answer: "They run active-passive across three clusters and fail over in under 30 seconds, driven by health checks every 5 seconds [S1].",
  citations: [{ label: "S1", slide: slidesFixture[1] }],
};

export const reportFixture: ReportResponse = {
  markdown: [
    "### Backrow live demo",
    "- Snapping a slide turns it into readable, searchable notes [S1]",
    "- Failover across three clusters happens in under 30 seconds [S2]",
    "",
    "### Top takeaways",
    "- Hybrid search beats keywords alone for messy questions [S3]",
    "",
    "### Worth following up",
    "- Try RRF on our own docs search [S3]",
  ].join("\n"),
  citations: [
    { label: "S1", slide: slidesFixture[0] },
    { label: "S2", slide: slidesFixture[1] },
    { label: "S3", slide: slidesFixture[2] },
  ],
};

export const meFixture: MeResponse = { slides: slidesFixture.map((s) => ({ ...s, mine: true })) };

export const translateFixture = (text: string, lang: string): TranslateResponse => ({
  text: `[${lang}] ${text}`,
});

export const liveFixture: LiveResponse = {
  total_snaps: 128,
  top_slides: slidesFixture.map((s) => ({ cluster_id: s.cluster_id, count: s.snaps ?? 1, slide: s })),
  rooms: [
    { room: "demo", room_name: "Demo Stage", talk_title: "Backrow live demo", snaps: 14, top_slide: slidesFixture[0] },
    { room: "kc-a", room_name: "KubeCon Hall A", talk_title: "Multi-cluster failover", snaps: 6, top_slide: slidesFixture[1] },
    { room: "kc-b", room_name: "KubeCon Hall B", talk_title: "Search that understands you", snaps: 3, top_slide: slidesFixture[2] },
  ],
  latest: slidesFixture,
};
