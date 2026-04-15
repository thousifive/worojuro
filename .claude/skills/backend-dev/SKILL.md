# Backend Developer

## Role
Owns all tRPC routers, AI modules, and services for Worojuro.

## Key tRPC procedures

### jobs router
- `getFeed` — vector similarity + woro score filter (default: hide < 30)
- `getWoroDetail` — returns full `woro_signals` for tooltip
- `saveJob` — marks match as saved, syncs to tracker
- `dismissJob` — hide from feed forever

### tracker router
- `getAll` — returns all applications grouped for Kanban
- `upsert` — create or update (id optional)
- `updateStatus` — drag-and-drop status change

### notifications router
- `getUnread` — for bell icon badge
- `getUnreadCount` — integer for badge
- `markRead` — single or all

### analysis router
- `getSignal` — returns latest signal, fires background regen if >24h stale
  **Pattern:** return stale immediately + fire-and-forget regeneration
  Never await AI in the user's request path

### resume router
- `confirmUpload` — called after client Storage upload
  Deactivates previous active resume, inserts new row
  Fires `parseResume()` fire-and-forget

### pulse router
- `getFeed(category)` — excludes dismissed items
- `interact(action)` — dismissed/saved/shared, upserts on conflict

## AI provider

All AI calls go through `server/ai/client.ts` — single entry point.
Active: **Ollama local** (llama3.2 + nomic-embed-text, no API key needed).
Boilerplate for Anthropic + OpenAI is commented in `client.ts` — swap when keys arrive.
Embedding dimensions: **768** (Ollama). Switching to OpenAI = migration to vector(1536) needed.

## AI modules (`/server/ai/`)

**woro-scorer.ts:**
- Input: job metadata (title, company, domain, description, source, posted_at)
- Calls Claude Haiku with structured JSON prompt
- Returns `{ score: number, signals: WoroSignals }` or `null` on failure
- Never block — returns null gracefully

**match-scorer.ts:**
- Input: job + user preferences + vectorSimilarity (cosine from pgvector)
- Final score = vectorSimilarity * 0.4 + AI dimension average * 0.6
- Returns `{ score, breakdown }` or null on failure

**market-analyser.ts:**
- Gathers application funnel + recent match counts + new job count
- Returns `{ signalType, analysis, dataSnapshot }` or null on failure

**resume-parser.ts:**
- Downloads from Supabase Storage
- Parses with Claude Haiku → skills, experience, education
- Embeds with OpenAI text-embedding-3-small
- Updates resume row with parsed data + embedding
- Dedup guard: skips if `embedding IS NOT NULL`

**pulse-summariser.ts:**
- `summarisePulseItem(db, id, title, raw, category)` — single item
- `summarisePendingItems(db)` — batch 50, 200ms delay between items
- Updates `summary_ai` on pulse_items

## Cron security pattern
```typescript
const auth = req.headers.get('authorization');
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
Both cron routes must have this check.

## Woro alert trigger rule
After any job ingestion where `woro_score < 40`:
For each user who has that job in their feed (job_matches):
→ create notification of type `woro_alert`
→ broadcast via Supabase Realtime

## Service role rule
All `INSERT`/`UPDATE` to `jobs` or `pulse_items` must use service role client.
Never use user JWT for these tables — they're global, not user-owned.

## MCPs
(none required)

## Tools
Read · Edit · Bash · Grep · Glob
