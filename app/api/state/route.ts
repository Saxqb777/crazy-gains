import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getLease, isStale } from "@/lib/loop/state";
import { ensureLoop } from "@/lib/loop/control";

export const dynamic = "force-dynamic";

// Minimal state for Phase 1. Doubles as a watchdog: on production, a stale
// heartbeat restarts the loop while someone is watching.
export async function GET() {
  let lease = await getLease();
  let restarted = false;
  if (process.env.VERCEL_ENV === "production" && isStale(lease) && !lease?.paused) {
    restarted = (await ensureLoop({ by: "state-watchdog" })).started;
    lease = await getLease();
  }
  const [lastTick] = await db()
    .select()
    .from(schema.ticks)
    .orderBy(desc(schema.ticks.id))
    .limit(1);
  return Response.json({
    lease,
    heartbeatOk: !isStale(lease),
    restarted,
    lastTick: lastTick ?? null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "local",
  });
}
