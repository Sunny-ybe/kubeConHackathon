# Build Backrow in parallel (4 agents)

The pattern is contract first, then build in parallel, then integrate. This kit is the contract (types, config, clients, schedule, fixtures, index setup), so four agents can start at the same time without touching each other's files.

## 1. Setup (you, about 15 minutes)
```bash
npx create-next-app@latest backrow        # accept the defaults
cd backrow
npm i @elastic/elasticsearch @anthropic-ai/sdk react-markdown qrcode @types/qrcode
# copy everything from backrow-kit/ into the repo root, merging folders
cp .env.example .env.local                # fill in the values
node --env-file=.env.local scripts/setup-es.mjs
git add -A && git commit -m "Backrow: spec and contract" && git push
```
In Vercel, import the repo and add the same env vars. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL.

## 2. Four worktrees, four agents
```bash
for x in a b c d; do
  git worktree add ../backrow-$x -b agent-$x
  cp .env.local ../backrow-$x/
  (cd ../backrow-$x && npm i)
done
```
Open one agent session (Claude Code or Codex) in each folder and paste:
> Read CLAUDE.md, SPEC.md and tasks/<task file>, then do the task.

| Folder | Task file | Port | Model |
|---|---|---|---|
| `../backrow-a` | `tasks/agent-a-pipeline.md` | 3001 | strongest |
| `../backrow-b` | `tasks/agent-b-phone-ui.md` | 3002 | any |
| `../backrow-c` | `tasks/agent-c-search-ask-report.md` | 3003 | strongest |
| `../backrow-d` | `tasks/agent-d-live-demo.md` | 3004 | any |

Too many to watch at once? Run three agents, and give D's task to C once C finishes.

## 3. While they build (1:30–3:00), you don't write code
1. **About 1:50:** when Agent A says `vision-test` is ready, run it on your 5 far-away slide photos. If the text comes back bad, tell A right away. This is the riskiest assumption in the project.
2. Build the 4-slide demo deck (SPEC §1).
3. Photograph 30–60 slides off a second screen playing 2–3 KubeCon recordings. Put each talk's photos in its own folder, for seeding.
4. Answer the agents' questions. Approve nothing that edits a frozen file.

## 4. Merge (about 3:00)
```bash
cd backrow            # main worktree
git merge agent-a && git merge agent-c && git merge agent-d && git merge agent-b
npm run build         # fix anything that fails
git push              # Vercel deploys
```
Merge the backend first and the UI last. Conflicts should only show up in `package-lock.json`; keep main's version.

Then test on your phone: open `/qr`, scan the demo QR, snap a slide, search, ask, write a report, and watch `/live`.

## 5. Round 2 (3:15–4:15)
Give each agent the bugs from your phone test, then merge again around 4:00. Build stretch features only if every must-have works at 4:15 (SPEC §0).

## 6. Freeze at 4:15
- **4:15** Seed the data: `node --env-file=.env.local scripts/seed.mjs <folder> <talk_id> <room>`. Snap your own slides so `/me` has a real trip report.
- **4:30** Rehearse 3 times. Fix only bugs that would break the demo.
- **5:00** Record a 90-second backup run. Check the README has setup steps and the AI disclosure.
- **5:15** Submit. Don't touch main after that.
