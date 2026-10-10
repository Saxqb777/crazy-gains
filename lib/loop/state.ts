import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";

// The single-loop lease. Only the run carrying the current generation may tick;
// any older run exits at its next tick.
export type LoopLease = {
  generation: number;
  runId?: string;
  startedAt?: string;
  startedBy?: string;
  lastTickAt?: string;
  lastSleepSec?: number;
  lastDeploymentId?: string;
  paused?: boolean;
};

export const getLease = () => getSetting<LoopLease | null>("loop", null);

// Atomically bump the generation and return the new value.
export async function bumpGeneration(startedBy: string): Promise<number> {
  const patch = { startedBy, startedAt: new Date().toISOString() };
  const rows = await db()
    .insert(schema.settings)
    .values({ key: "loop", value: { generation: 1, ...patch } })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: {
        value: sql`${schema.settings.value} || jsonb_build_object('generation', coalesce((${schema.settings.value}->>'generation')::int, 0) + 1) || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ value: schema.settings.value });
  return (rows[0].value as LoopLease).generation;
}

// Stale when the last tick is older than its own planned sleep plus 3 minutes.
export function isStale(lease: LoopLease | null, now = Date.now()) {
  if (!lease?.lastTickAt) return true;
  const graceMs = ((lease.lastSleepSec ?? 600) + 180) * 1000;
  return now - Date.parse(lease.lastTickAt) > graceMs;
}
