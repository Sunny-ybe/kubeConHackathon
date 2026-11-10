#!/usr/bin/env node
// Creates the opt-in people-card index (backrow-people).
// Usage:  node --env-file=.env.local scripts/setup-people.mjs [--reset]
//   --reset deletes and recreates the index (wipes all cards).
import { Client } from "@elastic/elasticsearch";

const PEOPLE = "backrow-people";

if (!process.env.ES_URL || !process.env.ES_API_KEY) {
  console.error("Missing ES_URL / ES_API_KEY. Run: node --env-file=.env.local scripts/setup-people.mjs");
  process.exit(1);
}

const es = new Client({ node: process.env.ES_URL, auth: { apiKey: process.env.ES_API_KEY } });

const semantic = process.env.ES_INFERENCE_ID
  ? { type: "semantic_text", inference_id: process.env.ES_INFERENCE_ID }
  : { type: "semantic_text" };

const settings = {
  analysis: {
    normalizer: { lowercase: { type: "custom", filter: ["lowercase", "asciifolding"] } },
  },
};

const mappings = {
  properties: {
    card_id: { type: "keyword" },
    name: { type: "text" },
    company: { type: "text", fields: { keyword: { type: "keyword", normalizer: "lowercase" } } },
    role: { type: "text", fields: { keyword: { type: "keyword" } } },
    about: { type: "text", copy_to: "semantic" },
    semantic,
    links: { type: "keyword" },
    created_at: { type: "date" },
  },
};

const reset = process.argv.includes("--reset");

try {
  const exists = await es.indices.exists({ index: PEOPLE });
  if (exists && reset) {
    await es.indices.delete({ index: PEOPLE });
    console.log(`deleted ${PEOPLE}`);
  } else if (exists) {
    console.log(`${PEOPLE} already exists (use --reset to recreate)`);
    process.exit(0);
  }
  await es.indices.create({ index: PEOPLE, settings, mappings });
  console.log(`created ${PEOPLE}`);
} catch (err) {
  console.error("Index setup failed:", err?.meta?.body?.error ?? err);
  console.error("If the error mentions semantic_text or inference, set ES_INFERENCE_ID and rerun.");
  process.exit(1);
}
