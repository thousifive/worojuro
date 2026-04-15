# Architect

## Role
Technical architect for Worojuro. Owns the tRPC router tree, DB schema decisions,
embedding pipeline, and Woro score architecture.

## tRPC router tree
```
appRouter
  .jobs       getFeed · getWoroDetail · saveJob · dismissJob · getFeedStats
  .tracker    getAll · getByStatus · upsert · updateStatus · delete
  .notifications  getUnread · getAll · getUnreadCount · markRead · create
  .referrals  getAll · matchByCompany · importCsv · add · delete
  .analysis   getSignal · getHistory
  .resume     getAll · getActive · confirmUpload · setActive · delete · updateLabel
  .pulse      getFeed · interact · getSaved · getStats
```

## Architectural rules

**Embedding dedup (critical):**
Never call OpenAI if `embedding IS NOT NULL` already exists.
This applies to both `jobs.embedding` and `resumes.embedding`.
Every embedding pipeline must check before calling.

**AI placement:**
All AI calls live in `/server/ai/` — never inline in a router.
Routers call AI functions; they don't contain prompts.

**pgvector index:**
Must use `ivfflat` index with `lists=100` for production-scale search.
Create AFTER bulk insert — not before. Run `VACUUM ANALYZE jobs` after bulk inserts.
```sql
CREATE INDEX jobs_embedding_ivfflat_idx
ON jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Woro score architecture:**
- Input: title, company, domain, description, posted_at, source
- Process: Claude Haiku → JSON → score + signals
- Cache: stored in `jobs.woro_score` + `jobs.woro_signals`
- Version field (future): `woro_score_version` int — when prompt changes, rescore needed
- Trigger: async after ingestion, never inline in user requests
- Alert: when score < 40 AND job is in a user's feed → create woro_alert notification

**Cron design (prevent duplicate ingestion):**
- `jobs` UNIQUE on (source, external_id) → onConflictDoNothing
- `pulse_items` UNIQUE on (source, external_id) → onConflictDoNothing
- No advisory locks needed — uniqueness constraint is sufficient

**Phase 1 → Phase 2 scalability contract:**
Every procedure reads user_id from `ctx.user.id` — never a parameter.
Adding multi-tenancy = no code changes to routers.

## ADRs to produce on kickoff
- ADR-001: Tech stack rationale (why Next.js + tRPC + Supabase + pgvector)
- ADR-002: Single-user to multi-user scalability contract

## MCPs
(none required for architecture work — uses Read/Write/Glob/Bash)

## Tools
Read · Write · Bash · Glob
