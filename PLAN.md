# THE PIT — build plan

Spec: `THE_PIT_claude_code_prompt.md`. This file records the agreed plan and every
decision the owner made, so any future session can pick up where the last stopped.

## Owner decisions (Phase 0, 2026-10-10)

- Paper equity = **$50**, same as the planned live amount. Owner resets the Alpaca paper account to $50.
- **Free tiers only** (Vercel Hobby + Neon free). Design around their limits.
- Crypto funding / open interest: try a public exchange feed, fall back silently if geo-blocked.
- Shorts allowed in code. At $50 Alpaca refuses them (needs $2k+, no fractional/crypto shorts), so a SELL verdict becomes a `BLOCKED_SHORT` shadow trade.
- Universe: picked by Claude (see `lib/config.ts`), editable later.
- Plan and project notes live in the repo (`PLAN.md`, `CLAUDE.md`).
- Owner prefers to review live; still stop after each phase.

## Free-tier constraints that shape the design

| Limit | Value | Effect |
|---|---|---|
| Vercel Workflow events (Hobby) | 50,000 / month | A tick costs ~5 events (step 3 + sleep 2). 60s ticks would be ~216k/month. |
| Workflow run log | 25,000 events (slow past 2,000) | Loop hands off to a fresh run every 24 ticks. |
| Function duration (Hobby) | 300s | Every step targets < 120s; one Opus call per step max. |
| Vercel cron (Hobby) | once per day | Daily watchdog only; `/api/state` also restarts a dead loop. |
| Neon free | limited compute hours | Fewer ticks lets the DB sleep more. |

**Cadence (default, editable in `settings.cadence`):** 5 min while US market is open
or a position is open, 10 min otherwise. Auto-stretches if the month's projected
events pass 80% of 45k. Set to 60s on a paid plan.

**Stops live at the broker.** Alpaca brackets don't support crypto or fractional
stock orders, so after every entry the loop places a separate broker-side stop
order. TP, invalidation and trailing are checked by the loop each tick.

## Loop design

```
floorLoop(state)            "use workflow"
  repeat 24x:
    tick()                  "use step"  (< 20s: lease check, scan, positions, heartbeat)
    sleep(cadence)          free
  start(floorLoop, latest)  continue-as-new on the newest deployment
```

- **Single loop lease** (`settings.loop.generation`). `/api/loop/start` bumps it and starts a run; any older run exits at its next tick.
- **Redeploys:** a running run stays on its old deployment until its 24-tick chunk ends, then the next run starts on the latest deployment. A force restart adopts new code immediately.
- **Watchdogs:** daily cron + `/api/state` (production) restart the loop if the heartbeat is older than its planned sleep + 3 min.
- **Debates** (Phase 3) run as separate workflow runs started by a tick, so the tick never blocks. Max 2 concurrent, 1 per symbol. One Opus call per step.

## Cost governor (Phase 3)

All Claude calls go through one runner: hourly cap (40, counted in `api_calls`) →
daily budget check → call → log tokens and dollars. 80% of budget: SCOUT 8+ to
open a debate. 100%: no calls, dashboard shows `AGENTS ASLEEP: BUDGET`. Cached
prefix: system prompt → universe → price table → agent memory.

## Phases

- [x] **0. Plan**
- [ ] **1. Skeleton:** Next.js 15, Neon schema, Alpaca paper equity page, ticking loop with heartbeat, survives redeploy
- [ ] **2. SCOUT + data:** universe, indicators, triggers, signal briefs
- [ ] **3. The debate:** 7 agents, protocol, JUDGE, RISK WARDEN, paper orders
- [ ] **4. Lifecycle + learning:** exits, shadow trades, HISTORIAN, reputation, daily summary
- [ ] **5. Dashboard:** demo mode first, then live
- [ ] **6. Hardening:** kill switch, budget tests, PDT, alerts, 7-day paper run
- [ ] **7. Live:** $50, crypto first (after owner review)
