#!/usr/bin/env node
// Creates the Backrow indices and loads data/schedule.json into backrow-talks.
// Usage:  node --env-file=.env.local scripts/setup-es.mjs [--reset]
//   --reset deletes and recreates both indices (wipes all slides).
// If index creation fails on semantic_text (e.g. start-local without a default model),
// set ES_INFERENCE_ID in .env.local to an inference endpoint id and rerun.
import { Client } from "@elastic/elasticsearch";
import { readFileSync } from "node:fs";

const TALKS = "backrow-talks";
const SLIDES = "backrow-slides";

if (!process.env.ES_URL || !process.env.ES_API_KEY) {
  console.error("Missing ES_URL / ES_API_KEY. Run: node --env-file=.env.local scripts/setup-es.mjs");
  process.exit(1);
}

const es = new Client({ node: process.env.ES_URL, auth: { apiKey: process.env.ES_API_KEY } });
const schedule = JSON.parse(readFileSync(new URL("../data/schedule.json", import.meta.url), "utf8"));

const semantic = process.env.ES_INFERENCE_ID
  ? { type: "semantic_text", inference_id: process.env.ES_INFERENCE_ID }
  : { type: "semantic_text" };

const talkMappings = {
  properties: {
    talk_id: { type: "keyword" },
    room: { type: "keyword" },
    room_name: { type: "keyword" },
    title: { type: "text", copy_to: "semantic" },
    speakers: { type: "text" },
    abstract: { type: "text", copy_to: "semantic" },
    start: { type: "date" },
    end: { type: "date" },
    semantic,
  },
};

const slideMappings = {
  properties: {
    slide_id: { type: "keyword" },
    device_id: { type: "keyword" },
    shared: { type: "boolean" },
    is_slide: { type: "boolean" },
    room: { type: "keyword" },
    talk_id: { type: "keyword" },
    talk_title: { type: "keyword" },
    taken_at: { type: "date" },
    title: { type: "text", copy_to: "semantic" },
    text: { type: "text", copy_to: "semantic" },
    alt_text: { type: "text", copy_to: "semantic" },
    topics: { type: "keyword" },
    cluster_id: { type: "keyword" },
    semantic,
    image: { type: "binary" },
    thumb: { type: "binary" },
  },
};

async function ensure(index, mappings, reset) {
  const exists = await es.indices.exists({ index });
  if (exists && reset) {
    await es.indices.delete({ index });
    console.log(`deleted ${index}`);
  } else if (exists) {
    console.log(`${index} already exists (use --reset to recreate)`);
    return;
  }
  await es.indices.create({ index, mappings });
  console.log(`created ${index}`);
}

const reset = process.argv.includes("--reset");

try {
  await ensure(TALKS, talkMappings, reset);
  await ensure(SLIDES, slideMappings, reset);
} catch (err) {
  console.error("Index setup failed:", err?.meta?.body?.error ?? err);
  console.error("If the error mentions semantic_text or inference, set ES_INFERENCE_ID and rerun.");
  process.exit(1);
}

const roomName = Object.fromEntries(schedule.rooms.map((r) => [r.room, r.name]));
const operations = schedule.talks.flatMap((t) => [
  { index: { _index: TALKS, _id: t.talk_id } },
  { ...t, room_name: roomName[t.room] ?? t.room },
]);

const res = await es.bulk({ operations });
if (res.errors) {
  const errors = res.items.filter((i) => i.index?.error).map((i) => i.index.error);
  console.error("Some talks failed to load:", JSON.stringify(errors, null, 2));
  process.exit(1);
}
console.log(`loaded ${schedule.talks.length} talks into ${TALKS}. Next: npm run dev`);
