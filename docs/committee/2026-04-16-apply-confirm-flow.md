# Feature committee review — Apply confirmation flow

**Date:** 2026-04-16
**Feature:** Two-step Apply flow — clicking Apply opens the job URL in a new tab and shows an inline "Did you apply?" prompt on the card; tracker entry only created on explicit "Yes" confirmation
**Type:** enhancement (one-click Apply)
**Verdict:** APPROVED
**Weighted score:** 9.0 / 10 (threshold: 7.0)
**Vetoes triggered:** 0

## Vote table

| Agent            | Score | Weight | Weighted |
|------------------|-------|--------|----------|
| Strategist       | 9/10  | 1.5    | 13.5     |
| Scrum master     | 8/10  | 1.0    | 8.0      |
| Architect        | 9/10  | 1.5    | 13.5     |
| Frontend dev     | 8/10  | 1.0    | 8.0      |
| Backend dev      | 9/10  | 1.0    | 9.0      |
| DB engineer      | 10/10 | 1.5    | 15.0     |
| Data analyst     | 9/10  | 1.0    | 9.0      |
| QA               | 9/10  | 1.0    | 9.0      |
| DevOps           | 10/10 | 1.0    | 10.0     |
| SRE              | 9/10  | 1.0    | 9.0      |
| Delivery manager | 9/10  | 1.5    | 13.5     |
| **Total**        |       | **13.0** | **117.5** |

## Key conditions

1. **Inline card state** — confirmation lives on the card itself, not a toast
2. **No server call on Apply click** — URL opens client-side only; `applyToJob` mutation fires only on confirm
3. **Auto-clear prompt after ~5 min** — avoid stale pending state if user abandons
4. **"No" / dismiss** — clears the prompt, no tracker entry, card returns to normal

## Implementation

- `JobCard` gains a `pendingConfirm` boolean state
- Apply click: `window.open(url)` + `setPendingConfirm(true)` — no tRPC call
- Inline prompt replaces action row: "Did you apply?" · [Yes, I applied] [No]
- "Yes": fires `applyToJob` mutation → sets `applied` state → shows Applied ✓ badge
- "No" / dismiss: `setPendingConfirm(false)` — nothing written to tracker
- Auto-clear: `setTimeout(() => setPendingConfirm(false), 5 * 60 * 1000)`
