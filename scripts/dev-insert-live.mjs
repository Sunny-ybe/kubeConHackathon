#!/usr/bin/env node
// Inserts fake shared slides so /live has real-looking counts and room heat
// before the snap pipeline (Agent A) is merged. Docs are marked device_id "dev-live".
//
// Usage:
//   node --env-file=.env.local scripts/dev-insert-live.mjs            # 24 snaps at once
//   node --env-file=.env.local scripts/dev-insert-live.mjs 40         # 40 snaps at once
//   node --env-file=.env.local scripts/dev-insert-live.mjs 10 --trickle   # 1 snap every 3s
//   node --env-file=.env.local scripts/dev-insert-live.mjs --clean    # delete all dev-live docs
import { Client } from "@elastic/elasticsearch";
import { randomUUID } from "node:crypto";

const SLIDES = "backrow-slides";
const DEVICE = "dev-live";

if (!process.env.ES_URL || !process.env.ES_API_KEY) {
  console.error("Missing ES_URL / ES_API_KEY. Run: node --env-file=.env.local scripts/dev-insert-live.mjs");
  process.exit(1);
}
const es = new Client({ node: process.env.ES_URL, auth: { apiKey: process.env.ES_API_KEY } });

// A few slides per room. `weight` makes some slides far more photographed than others,
// so the leaderboard shows clear ×N differences.
const SLIDES_BY_ROOM = {
  demo: {
    talk_id: "demo-live",
    talk_title: "Backrow live demo",
    slides: [
      { key: "snap-this", weight: 8, title: "Snap this slide", text: "Snap this slide\nBackrow: snap a slide, keep the talk", alt_text: "A large QR code linking to the Backrow demo room.", topics: ["backrow", "demo"] },
      { key: "es-arch", weight: 3, title: "How Elasticsearch runs Backrow", text: "One index of talks and slides\nRange query tags each snap to its talk\nHybrid RRF search with highlights\ncollapse + terms + top_hits for the feed", alt_text: "Architecture diagram: phones post snaps to a Next.js API, which calls Claude vision and writes to Elasticsearch.", topics: ["elasticsearch", "architecture"] },
    ],
  },
  "kc-a": {
    talk_id: "kc-a-1",
    talk_title: "Surviving a region outage: multi-cluster failover on Kubernetes",
    slides: [
      { key: "three-clusters", weight: 6, title: "Active-passive across three clusters", text: "Primary: us-west\nStandby: us-east, eu-central\nHealth checks every 5s\nFailover in under 30s", alt_text: "Diagram of three Kubernetes clusters. Traffic moves from the primary in us-west to a standby in us-east when health checks fail.", topics: ["failover", "multi-cluster", "kubernetes"] },
      { key: "runbook", weight: 3, title: "The failover runbook", text: "1. Freeze deploys\n2. Promote the replica database\n3. Flip global load balancer weights\n4. Verify synthetic checks", alt_text: "", topics: ["runbook", "incident-response"] },
      { key: "what-broke", weight: 2, title: "What broke on the way", text: "DNS TTLs cached for 10 minutes\nSecrets not replicated\nCron jobs ran twice", alt_text: "", topics: ["lessons", "dns"] },
    ],
  },
  "kc-b": {
    talk_id: "kc-b-1",
    talk_title: "Observability for platform teams: from golden signals to SLOs with OpenTelemetry",
    slides: [
      { key: "burn-rate", weight: 5, title: "Alert on burn rate, not noise", text: "Fast burn: 2% budget in 1h -> page\nSlow burn: 10% in 3d -> ticket\nNo more CPU > 80% pages", alt_text: "Line chart of error budget remaining over 30 days, with two burn-rate thresholds marked.", topics: ["slo", "alerting"] },
      { key: "collector", weight: 2, title: "OpenTelemetry collector topology", text: "Agent per node -> gateway per cluster\nTail sampling at the gateway\nKeep 100% of errors, 5% of the rest", alt_text: "Diagram of collectors on each node forwarding to a gateway collector that samples and exports traces.", topics: ["opentelemetry", "sampling"] },
    ],
  },
  main: {
    talk_id: "lunch-panel",
    talk_title: "Platform engineering in production: what we would do differently",
    slides: [
      { key: "golden-paths", weight: 3, title: "Golden paths people actually use", text: "Start from the top 3 service shapes\nTemplates over tickets\nMeasure adoption, not launches", alt_text: "", topics: ["platform-engineering", "developer-experience"] },
    ],
  },
};

const pool = Object.entries(SLIDES_BY_ROOM).flatMap(([room, r]) =>
  r.slides.flatMap((s) => Array.from({ length: s.weight }, () => ({ room, talk: r, s }))),
);

function doc(minutesAgoMax) {
  const { room, talk, s } = pool[Math.floor(Math.random() * pool.length)];
  const slide_id = randomUUID();
  const takenAt = new Date(Date.now() - Math.random() * minutesAgoMax * 60_000).toISOString();
  return {
    slide_id,
    device_id: DEVICE,
    shared: true,
    is_slide: true,
    room,
    talk_id: talk.talk_id,
    talk_title: talk.talk_title,
    taken_at: takenAt,
    title: s.title,
    text: s.text,
    alt_text: s.alt_text,
    topics: s.topics,
    cluster_id: `dev-live-${s.key}`,
  };
}

const args = process.argv.slice(2);

if (args.includes("--clean")) {
  const res = await es.deleteByQuery({ index: SLIDES, refresh: true, query: { term: { device_id: DEVICE } } });
  console.log(`deleted ${res.deleted} dev-live slides`);
  process.exit(0);
}

const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 24);

if (args.includes("--trickle")) {
  for (let i = 0; i < count; i++) {
    const d = doc(0);
    await es.index({ index: SLIDES, id: d.slide_id, document: d, refresh: true });
    console.log(`${new Date().toLocaleTimeString()}  ${d.room.padEnd(5)}  ${d.title}`);
    if (i < count - 1) await new Promise((r) => setTimeout(r, 3000));
  }
} else {
  const docs = Array.from({ length: count }, () => doc(8));
  const res = await es.bulk({
    refresh: true,
    operations: docs.flatMap((d) => [{ index: { _index: SLIDES, _id: d.slide_id } }, d]),
  });
  if (res.errors) {
    console.error(JSON.stringify(res.items.filter((i) => i.index?.error).map((i) => i.index.error), null, 2));
    process.exit(1);
  }
  console.log(`inserted ${count} dev-live slides. Clean up with --clean`);
}
