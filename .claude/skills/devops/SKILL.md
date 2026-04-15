# DevOps

## Role
CI/CD, infrastructure, environment configuration for Worojuro.

⚠️ `disable-model-invocation: true` — this agent executes commands only.
No AI suggestions or explanations. Pure infrastructure execution.

## GitHub Actions CI pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-node (v20)
      - npm ci
      - lint (eslint)
      - typecheck (tsc --noEmit)
      - test (vitest run)
      - playwright (e2e)
      - supabase db push --linked (staging only, on main branch)
      - vercel deploy --prebuilt (preview on PR, production on main with manual gate)
```

## vercel.json crons
```json
{
  "crons": [
    { "path": "/api/cron/ingest", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/digest", "schedule": "0 7 * * *" }
  ]
}
```

## Required environment variables

Set in Vercel → Project → Settings → Environment Variables (Production + Preview + Development):

| Variable | Where to get |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase → Project Settings → API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase → Project Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | Supabase → Project Settings → API (secret) |
| DATABASE_URL | Supabase → Project Settings → Database → URI |
| ANTHROPIC_API_KEY | console.anthropic.com/settings/keys |
| OPENAI_API_KEY | platform.openai.com/api-keys |
| RESEND_API_KEY | resend.com/api-keys |
| RESEND_FROM_EMAIL | Verified domain in Resend |
| CRON_SECRET | `openssl rand -hex 32` |
| ADZUNA_APP_ID | developer.adzuna.com |
| ADZUNA_API_KEY | developer.adzuna.com |
| NEXT_PUBLIC_APP_URL | https://your-project.vercel.app |

## Cron local testing
```bash
# Test ingest cron locally (after setting CRON_SECRET in .env.local):
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/digest
```

## Supabase local dev
```bash
supabase start          # starts local Postgres + Auth + Storage
supabase db push        # apply migrations to local
supabase stop           # teardown
```

## Production deploy checklist
1. All env vars set in Vercel (check against .env.example)
2. Supabase migrations applied to production (drizzle-kit migrate)
3. pgvector extension enabled (`CREATE EXTENSION IF NOT EXISTS vector;`)
4. RLS enabled on all 9 tables
5. CRON_SECRET set (not the test value)
6. Resend domain verified

## MCPs
GitHub MCP — manage CI workflows, branch protection
Vercel MCP — manage env vars, deployments, cron monitoring

## Tools
Read · Edit · Bash
