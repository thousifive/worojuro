# Feature committee review — Woro scorer: repost-age signal

**Date:** 2026-04-16
**Feature:** Compute days_since_posted from existing postedAt field, inject into Woro scoring prompt, store in woro_signals
**Type:** enhancement (woro-score)
**Verdict:** APPROVED
**Weighted score:** 9.1 / 10 (threshold: 7.0)
**Vetoes triggered:** 0

## Vote table

| Agent            | Score | Weight | Weighted |
|------------------|-------|--------|----------|
| Strategist       | 9/10  | 1.5    | 13.5     |
| Scrum master     | 9/10  | 1.0    | 9.0      |
| Architect        | 9/10  | 1.5    | 13.5     |
| Frontend dev     | 8/10  | 1.0    | 8.0      |
| Backend dev      | 9/10  | 1.0    | 9.0      |
| DB engineer      | 10/10 | 1.5    | 15.0     |
| Data analyst     | 9/10  | 1.0    | 9.0      |
| QA               | 9/10  | 1.0    | 9.0      |
| DevOps           | 10/10 | 1.0    | 10.0     |
| SRE              | 9/10  | 1.0    | 9.0      |
| Delivery manager | 9/10  | 1.5    | 13.5     |
| **Total**        |       | **13.0** | **118.5** |

## Implementation

1. `server/ai/woro-scorer.ts` — compute `daysSincePosted`, inject into prompt
2. `types/index.ts` — add `days_since_posted: number | null` to `WoroSignals`
3. `components/feed/WoroScoreBadge.tsx` — show age in tooltip when > 14 days

## Key conditions

- Null postedAt: omit age line from prompt, set days_since_posted = null in signals
- Show in tooltip only when > 14 days (not suspicious under that)
- Store as number not string in woro_signals JSON
- Single atomic commit
