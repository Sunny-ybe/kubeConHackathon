#!/usr/bin/env node
// Runs the Backrow vision prompt (SPEC §7.1) on every image in a folder.
// Usage: node --env-file=.env.local scripts/vision-test.mjs <folder>
import Anthropic from "@anthropic-ai/sdk";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const PROMPT = `You read photos of presentation slides taken by audience members, often from far away,
at an angle, or blurry. Return ONLY a JSON object with these keys:
"is_slide": true if the photo mainly shows a presentation slide or screen content, else false.
"title": the slide's title, or "" if none.
"text": all readable text on the slide in reading order, verbatim, lines separated by \\n.
        Never invent text you cannot read; skip unreadable parts.
"alt_text": 1-3 sentences describing any diagram, chart, code, or image on the slide for
            someone who cannot see it. "" if the slide is only text.
"topics": up to 5 short lowercase topic tags.
Describe only the slide. Never describe people, faces, clothing, or the room.`;

const SCHEMA = {
  type: "object",
  properties: {
    is_slide: { type: "boolean" },
    title: { type: "string" },
    text: { type: "string" },
    alt_text: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
  },
  required: ["is_slide", "title", "text", "alt_text", "topics"],
  additionalProperties: false,
};

const folder = process.argv[2];
if (!folder) {
  console.error("Usage: node --env-file=.env.local scripts/vision-test.mjs <folder>");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY. Run with --env-file=.env.local");
  process.exit(1);
}

const model = process.env.CLAUDE_VISION_MODEL || "claude-sonnet-5-5";
const fast = model.startsWith("claude-sonnet-5-5") ? { thinking: { type: "between_tools" } } : {};
const client = new Anthropic({ maxRetries: 1 });

const files = readdirSync(folder)
  .filter((f) => [".jpg", ".jpeg", ".png"].includes(extname(f).toLowerCase()))
  .sort();
if (!files.length) {
  console.error(`No .jpg, .jpeg or .png files in ${folder}`);
  process.exit(1);
}
console.log(`model: ${model}, ${files.length} file(s)\n`);

for (const file of files) {
  const data = readFileSync(join(folder, file)).toString("base64");
  const media_type = extname(file).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
  const t0 = Date.now();
  try {
    const msg = await client.messages.create(
      {
        model,
        max_tokens: 2000,
        ...fast,
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type, data } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      },
      { timeout: 20_000 },
    );
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    let out;
    try {
      out = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      out = text;
    }
    console.log(`== ${file}  (${Date.now() - t0} ms)\n${out}\n`);
  } catch (err) {
    console.log(`== ${file}  (${Date.now() - t0} ms)  ERROR: ${err?.message ?? err}\n`);
  }
}
