# THE PIT — notes for Claude

Autonomous multi-agent trading floor. Full spec: `THE_PIT_claude_code_prompt.md`.
Agreed plan, owner decisions and phase status: `PLAN.md`. Read both first.

## Working rules from the owner

- Keep replies short, bullets. Explain in depth only when asked.
- Never make a change without full final confirmation. Stop after each phase and wait for "go".
- Work on branch `claude/modest-meitner-jtjaib`. No PR unless asked.

## Infra

- Vercel team `saxqb777s-projects`, project `the-pit` (Hobby). Region `iad1`.
- Neon project `the-pit` (`gentle-wave-82038778`), us-east-1, db `neondb`.
- Vercel needs "Enable access to System Environment Variables" on, or Workflow falls back to the local world and fails.

## Stack notes

- Next.js 15 + **webpack** (Turbopack breaks the workflow loader, so no `--turbopack`).
- `workflow` v5 docs ship in `node_modules/workflow/docs`; read them, not memory.
- Workflow functions are sandboxed: no Node APIs, no `process.env`. Put I/O in `"use step"` functions under `workflows/steps/`.
- DB: Drizzle + `@neondatabase/serverless` HTTP driver. `lib/db` exports a lazy `db()`.
- Schema change: edit `lib/db/schema.ts`, `npm run db:generate`, `npm run db:migrate`.
- Middleware basic-auths everything except `/.well-known/workflow/*` and `/api/cron/*`.

## Commands

- `npm run dev` (set `LOOP_SLEEP_OVERRIDE_SEC=5` in `.env.local` for fast local ticks)
- `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run db:seed` (idempotent)
