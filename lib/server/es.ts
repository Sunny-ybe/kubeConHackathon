// Server-only Elasticsearch client (lazy, so builds don't crash without env). FROZEN.
import { Client } from "@elastic/elasticsearch";

let client: Client | null = null;

export function es(): Client {
  if (client) return client;
  const node = process.env.ES_URL;
  const apiKey = process.env.ES_API_KEY;
  if (!node || !apiKey) throw new Error("Set ES_URL and ES_API_KEY in .env.local");
  client = new Client({ node, auth: { apiKey } });
  return client;
}
