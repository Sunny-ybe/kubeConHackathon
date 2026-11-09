#!/usr/bin/env node
// Posts every image in a folder to /api/snap as shared "seed" snaps for one talk.
// Usage: node --env-file=.env.local scripts/seed.mjs <folder> <talk_id> <room>
// Target: SEED_URL (default http://localhost:3000). taken_at is spaced one minute apart, ending now.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";

const MAX_BYTES = 2_000_000;
const [folder, talkId, room] = process.argv.slice(2);
if (!folder || !talkId || !room) {
  console.error("Usage: node --env-file=.env.local scripts/seed.mjs <folder> <talk_id> <room>");
  process.exit(1);
}
const base = process.env.SEED_URL ?? "http://localhost:3000";

const files = readdirSync(folder)
  .filter((f) => [".jpg", ".jpeg", ".png"].includes(extname(f).toLowerCase()))
  .sort()
  .map((f) => join(folder, f));
if (!files.length) {
  console.error(`No .jpg, .jpeg or .png files in ${folder}`);
  process.exit(1);
}

const start = Date.now() - (files.length - 1) * 60_000;
let ok = 0;
let skipped = 0;
let failed = 0;

for (const [i, file] of files.entries()) {
  const name = basename(file);
  const tag = `[${i + 1}/${files.length}] ${name}`;
  if (statSync(file).size > MAX_BYTES) {
    console.warn(`${tag}: skipped, over 2 MB (resize it first)`);
    skipped++;
    continue;
  }
  const type = extname(file).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
  const blob = new Blob([readFileSync(file)], { type });
  const form = new FormData();
  form.append("image", blob, name);
  form.append("thumb", blob, name);
  form.append("room", room);
  form.append("device_id", "seed");
  form.append("shared", "true");
  form.append("talk_id", talkId);
  form.append("taken_at", new Date(start + i * 60_000).toISOString());

  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/api/snap`, { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    const ms = Date.now() - t0;
    if (body.ok) {
      ok++;
      console.log(`${tag}: ok (${ms} ms) "${body.slide.title}" cluster ${body.slide.cluster_id} x${body.cluster_size}`);
    } else {
      failed++;
      console.log(`${tag}: ${body.reason ?? `HTTP ${res.status}`} (${ms} ms) ${body.message ?? ""}`);
    }
  } catch (err) {
    failed++;
    console.log(`${tag}: request failed: ${err?.message ?? err}`);
  }
}

console.log(`\nDone: ${ok} indexed, ${failed} not indexed, ${skipped} skipped.`);
