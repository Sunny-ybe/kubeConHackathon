#!/usr/bin/env node
// Inserts ~15 realistic fake slides into backrow-slides so search, Ask and /me can be
// tested before the snap pipeline lands. No images (the UI falls back to text tiles).
// Usage:  node --env-file=.env.local scripts/dev-insert-slides.mjs [--device <id>]
//   --device sets device_id (default "dev"). To see them on /me in a browser, run
//   localStorage.setItem("backrow_device_id", "dev") in the console, or pass your own id.
// Ids are fixed (dev-01…), so rerunning overwrites instead of duplicating.
import { Client } from "@elastic/elasticsearch";
import { readFileSync } from "node:fs";

const SLIDES = "backrow-slides";

if (!process.env.ES_URL || !process.env.ES_API_KEY) {
  console.error("Missing ES_URL / ES_API_KEY. Run: node --env-file=.env.local scripts/dev-insert-slides.mjs");
  process.exit(1);
}

const i = process.argv.indexOf("--device");
const deviceId = i > -1 && process.argv[i + 1] ? process.argv[i + 1] : "dev";

const es = new Client({ node: process.env.ES_URL, auth: { apiKey: process.env.ES_API_KEY } });
const schedule = JSON.parse(readFileSync(new URL("../data/schedule.json", import.meta.url), "utf8"));
const talks = Object.fromEntries(schedule.talks.map((t) => [t.talk_id, t]));

// [talk_id, minutes after talk start, title, text, alt_text, topics]
const SLIDES_DATA = [
  ["kickoff", 4, "Why Radar", "Agents can write code but can't see the cluster\nRadar gives your coding agent eyes on Kubernetes\nPods, events, logs and rollouts in one API", "", ["radar", "agents", "kubernetes"]],
  ["kickoff", 11, "Connecting your agent", "1. Install the Radar MCP server\n2. radar login --team hackathon\n3. Point Claude Code at the MCP endpoint\nThe agent can now list deployments and read logs", "A terminal screenshot showing radar login succeeding and an MCP server listening on port 7420.", ["radar", "mcp", "setup"]],
  ["kickoff", 19, "Shipping through the agent", "Ask: deploy checkout-api v2 to staging\nAgent builds, pushes the image, opens a PR\nRollout status streams back into the chat", "", ["deploys", "agents", "ci"]],
  ["kickoff", 27, "AI SRE: why did the release break?", "checkout-api v2: CrashLoopBackOff\nRoot cause: missing env var PAYMENTS_URL\nIntroduced in commit 4f2a9c1\nSuggested fix: add it to the Helm values", "A timeline chart of a rollout: green pods turn red at 14:02, with an annotation pointing at the config change.", ["sre", "debugging", "helm"]],
  ["kickoff", 35, "Multi-cluster failover", "Primary: us-east-1   Standby: us-west-2\nHealth checks every 5s\nFailover in under 30 seconds\nDNS weight shifts automatically when the primary is unhealthy", "A diagram with three clusters: two regional clusters connected to a global load balancer, with arrows showing traffic moving from the failed primary to the standby.", ["failover", "multi-cluster", "reliability"]],
  ["kickoff", 41, "Failover drill results", "Simulated region outage at 10:41\nTraffic moved to the standby cluster in 22s\nZero dropped checkouts\nLesson: rehearse failover every sprint", "A bar chart comparing recovery time across four drills, falling from 95 seconds to 22 seconds.", ["failover", "chaos", "drills"]],
  ["kickoff", 48, "Questions?", "radar.dev/hackathon\n@radar on Slack", "", ["radar"]],
  ["kc-a-1", 6, "etcd under pressure", "etcd p99 latency > 200ms means trouble\nWatch db size and defrag regularly\nKeep etcd on dedicated SSDs", "A line chart of etcd p99 latency spiking during a large list request storm.", ["etcd", "performance"]],
  ["kc-a-1", 14, "Scaling nodes with Karpenter", "Karpenter provisions right-sized nodes in seconds\nConsolidation removes underused nodes\nSpot plus on-demand with fallback", "", ["karpenter", "autoscaling", "cost"]],
  ["kc-a-1", 22, "Active-passive across clusters", "Replicate state to a second cluster continuously\nOn outage, promote the replica and flip traffic\nRTO 1 minute, RPO 5 seconds", "Two Kubernetes clusters side by side; a replication arrow runs from active to passive, and a switch icon shows traffic being redirected.", ["failover", "disaster-recovery", "multi-cluster"]],
  ["kc-a-1", 30, "Cost dashboards that people read", "Show cost per team, not per node\nAlert on week-over-week change\nPut the number in the PR comment", "", ["finops", "cost"]],
  ["kc-b-1", 5, "OpenTelemetry in 10 minutes", "Auto-instrument with the OTel Operator\nOne collector per node, one gateway per cluster\nExport OTLP to any backend", "A pipeline diagram: apps send spans to node collectors, which forward to a gateway collector and then to a tracing backend.", ["opentelemetry", "observability"]],
  ["kc-b-1", 13, "Sampling without losing errors", "Head sampling at 10%\nTail sampling keeps every error and slow trace\nBudget: 1 GB of spans per day", "", ["opentelemetry", "sampling", "tracing"]],
  ["kc-b-1", 21, "Gateway API in production", "HTTPRoute replaces Ingress annotations\nTraffic splitting for canaries: 90/10\nError: no matching parent ref for listener http", "", ["gateway-api", "networking", "canary"]],
  ["kc-b-1", 29, "Policy as code with Kyverno", "Block images without signatures\nRequire resource limits on every pod\nAudit mode first, then enforce", "", ["kyverno", "security", "policy"]],
];

const operations = SLIDES_DATA.flatMap(([talkId, min, title, text, alt_text, topics], n) => {
  const talk = talks[talkId];
  if (!talk) throw new Error(`Unknown talk_id ${talkId} in data/schedule.json`);
  const id = `dev-${String(n + 1).padStart(2, "0")}`;
  const takenAt = new Date(new Date(talk.start).getTime() + min * 60_000).toISOString();
  return [
    { index: { _index: SLIDES, _id: id } },
    {
      slide_id: id,
      device_id: deviceId,
      shared: true,
      is_slide: true,
      room: talk.room,
      talk_id: talk.talk_id,
      talk_title: talk.title,
      taken_at: takenAt,
      title,
      text,
      alt_text,
      topics,
      cluster_id: id,
    },
  ];
});

const res = await es.bulk({ refresh: true, operations });
if (res.errors) {
  const failed = res.items.filter((it) => it.index?.error);
  console.error(`${failed.length} slides failed:`, JSON.stringify(failed[0].index.error, null, 2));
  process.exit(1);
}
console.log(`Inserted ${res.items.length} slides into ${SLIDES} with device_id "${deviceId}".`);
