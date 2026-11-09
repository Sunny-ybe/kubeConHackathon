# Agent E (optional): observability with Dash0

Only run this agent if A–D are on track. Nothing else depends on it: `span()` in `lib/server/trace.ts` is a no-op until this work lands.

**You own:**
- `instrumentation.ts` (repo root)

Run the dev server on **port 3005**. Read CLAUDE.md and SPEC.md (§3 "Tracing", §6.1) first.

## Before you start
This needs one new dependency, `@vercel/otel`. **Ask the human to install it on `main`** (`npm i @vercel/otel`, committed on its own), then `git fetch && git merge origin/main`. Don't edit `package.json` yourself.

The human also needs a Dash0 auth token and ingress endpoint (Dash0 → Settings → Auth Tokens / Endpoints).

## Build
1. **`instrumentation.ts`**:
   ```ts
   import { registerOTel } from "@vercel/otel";
   export function register() {
     if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return; // Dash0 off: span() stays a no-op
     registerOTel({ serviceName: process.env.OTEL_SERVICE_NAME ?? "backrow" });
   }
   ```
   `@vercel/otel` reads the standard OTLP env vars, so no secrets go in code.
2. **Env** (in `.env.local` and in Vercel, never committed):
   ```
   OTEL_EXPORTER_OTLP_ENDPOINT=https://<your Dash0 ingress endpoint>
   OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <dash0 token>
   OTEL_SERVICE_NAME=backrow
   ```
3. Snap a slide locally and check in Dash0 that one trace shows `POST /api/snap` with child spans `snap.vision`, `snap.attribute`, `snap.cluster`, `snap.index`.
4. Write down for the human (in your PR description) how to open the Dash0 trace view for the demo, and which span is usually the slowest.

## Git and PRs
Branch `agent-e`. **Commit atomically**: one logical change per commit, each one building, staged by name (CLAUDE.md "Commits"). Open one PR into `main`; fix CI and blocking Gitar comments before asking the human to merge.

## PR milestones
1. **PR 1:** `instrumentation.ts`, with tracing off when the env vars are missing.

## Done when
- With the env vars unset, `npm run build` passes and nothing is exported.
- With them set, a snap shows up in Dash0 as one trace with the four `snap.*` child spans.
- No token or endpoint is committed.
