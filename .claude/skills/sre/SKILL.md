# SRE

## Role
Reliability, observability, and runbooks for Worojuro free tier infrastructure.

## SLOs

| SLO | Target | Measurement |
|---|---|---|
| Feed load p95 | < 3s | Vector search is the bottleneck — watch ivfflat index |
| Woro score available | within 60s of job ingestion | Check scored_at vs ingested_at |
| Cron completion | < 5min per run | Check Vercel cron logs |
| Email delivery rate | > 95% | Resend dashboard |
| Notification realtime | < 2s delivery | Supabase Realtime dashboard |

## Runbooks

### pgvector index degradation after bulk insert
```sql
-- After ingesting > 1000 new jobs:
VACUUM ANALYZE jobs;
-- Rebuild index if cosine similarity queries slow:
REINDEX INDEX CONCURRENTLY jobs_embedding_ivfflat_idx;
```

### Supabase connection pool exhaustion
Symptom: "too many connections" errors in Vercel logs
Fix: Enable pgBouncer in Supabase → Project Settings → Database → Connection pooling
Update `DATABASE_URL` to use the pooled connection string.

### Resend daily limit hit (100/day free tier)
Symptom: digest cron logs `429 Too Many Requests`
Action:
1. Log the failure to Vercel logs (already handled by try/catch)
2. Fall back to in-app notification only
3. Consider batch digest (combine multiple users into fewer emails)
4. Upgrade Resend if hitting limit consistently

### Anthropic rate limit
Symptom: `429` from Anthropic API in woro-scorer or match-scorer logs
Action:
1. woro-scorer: skip scoring, leave `woro_score = null`, retry next cron run
2. match-scorer: skip match, leave match without breakdown
3. Log with `[rate-limit]` prefix for monitoring
4. Implement exponential backoff for retry (max 3 attempts, 1s/2s/4s)
Never block ingestion pipeline on rate limit.

### Woro scorer returning > 60% red scores (model drift)
Symptom: data-analyst query shows red_pct > 60% across all sources
Action:
1. Alert founder immediately
2. Pull 10 random red-scored jobs, manually review woro_signals
3. If signals are wrong → review system prompt in `woro-scorer.ts`
4. Add `woro_score_version` field to jobs table before rescoring

### Cold start latency on first feed load
Symptom: p95 > 5s after Vercel serverless cold start
Action:
1. Check if ivfflat index exists: `\d jobs` in psql
2. Ensure `lists=100` is set (appropriate for < 1M rows)
3. Consider pgBouncer for connection reuse

## Monitoring tools
- Vercel Analytics (free) — request rates, error rates
- Supabase dashboard — DB query performance, connection count
- Vercel logs — cron execution, AI call failures
- No Datadog or Sentry at MVP

## MCPs
Supabase MCP — inspect table stats, run VACUUM, check index health
Vercel MCP — read cron logs, check deployment status

## Tools
Read · Write · Bash
