import { and, count, eq, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSetting, patchSetting } from "@/lib/settings";
import { getLease } from "@/lib/loop/state";
import { nextSleepSec, type Cadence } from "@/lib/loop/cadence";
import { DEFAULT_CADENCE } from "@/lib/config";
import { alpaca, alpacaConfigured, roughMarketOpen } from "@/lib/alpaca/client";

export type TickInput = { generation: number; tickNo: number; runId: string };
export type TickResult = { stop: boolean; reason?: string; sleepSec: number };

// One loop tick. Never throws: a failed tick is logged and the loop keeps going.
// Phase 1 only writes the heartbeat; later phases add SCOUT and position checks.
export async function tick(input: TickInput): Promise<TickResult> {
  "use step";
  const startedAt = new Date();
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? "local";

  try {
    const lease = await getLease();
    if (!lease || lease.generation !== input.generation) {
      return { stop: true, reason: `superseded by generation ${lease?.generation}`, sleepSec: 0 };
    }
    if (lease.paused) {
      return { stop: true, reason: "paused", sleepSec: 0 };
    }
  } catch (err) {
    // DB unreachable: keep looping, try again next tick.
    console.error("lease check failed", err);
    return { stop: false, sleepSec: DEFAULT_CADENCE.closedSec };
  }

  let ok = true;
  let error: string | null = null;
  let marketOpen = roughMarketOpen(startedAt);
  const notes: Record<string, unknown> = {};

  if (alpacaConfigured()) {
    try {
      const [clock, account] = await Promise.all([alpaca.clock(), alpaca.account()]);
      marketOpen = clock.is_open;
      notes.equity = Number(account.equity);
      notes.cash = Number(account.cash);
    } catch (err) {
      ok = false;
      error = String(err).slice(0, 500);
    }
  } else {
    notes.alpaca = "not configured";
  }

  let sleepSec: number = DEFAULT_CADENCE.closedSec;
  try {
    const cadence = await getSetting<Cadence>("cadence", DEFAULT_CADENCE);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [{ n }] = await db()
      .select({ n: count() })
      .from(schema.ticks)
      .where(gte(schema.ticks.createdAt, monthStart));
    const [{ open }] = await db()
      .select({ open: count() })
      .from(schema.positions)
      .where(and(eq(schema.positions.status, "OPEN")));
    sleepSec = nextSleepSec({ cadence, marketOpen, openPositions: open, ticksThisMonth: n, now });
    // Local testing only: tick fast without touching the real cadence.
    if (process.env.LOOP_SLEEP_OVERRIDE_SEC) sleepSec = Number(process.env.LOOP_SLEEP_OVERRIDE_SEC);

    await db().insert(schema.ticks).values({
      runId: input.runId,
      generation: input.generation,
      deploymentId,
      tickNo: input.tickNo,
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      marketOpen,
      nextSleepSec: sleepSec,
      ok,
      error,
      notes,
    });
    await patchSetting("loop", {
      runId: input.runId,
      lastTickAt: new Date().toISOString(),
      lastSleepSec: sleepSec,
      lastDeploymentId: deploymentId,
    });
  } catch (err) {
    console.error("tick write failed", err);
  }

  return { stop: false, sleepSec };
}
tick.maxRetries = 1;
