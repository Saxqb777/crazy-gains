import { start } from "workflow/api";
import { floorLoop } from "@/workflows/floor-loop";
import { bumpGeneration, getLease, isStale } from "@/lib/loop/state";
import { patchSetting } from "@/lib/settings";

// Start a fresh loop if forced, or if the current one looks dead.
// Bumping the generation makes any older run exit at its next tick.
export async function ensureLoop(opts: { force?: boolean; by: string }) {
  const lease = await getLease();
  if (!opts.force && (lease?.paused || !isStale(lease))) {
    return { started: false, lease };
  }
  const generation = await bumpGeneration(opts.by);
  const run = await start(floorLoop, [{ generation, tickNo: 0, chain: 0 }]);
  await patchSetting("loop", { runId: run.runId, paused: false });
  return { started: true, generation, runId: run.runId };
}

export async function pauseLoop(by: string) {
  await patchSetting("loop", { paused: true, pausedBy: by, pausedAt: new Date().toISOString() });
}
