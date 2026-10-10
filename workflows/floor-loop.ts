import { getWorkflowMetadata, sleep } from "workflow";
import { start } from "workflow/api";
import { tick } from "./steps/tick";

// Ticks per run before handing off to a fresh run on the latest deployment.
// Keeps each run's event log small and picks up new code automatically.
const TICKS_PER_RUN = 24;

export type LoopState = { generation: number; tickNo: number; chain: number };
export type LoopResult = { stopped?: boolean; reason?: string; continuedAs?: string; tickNo: number };

export async function floorLoop(state: LoopState): Promise<LoopResult> {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  let tickNo = state.tickNo;

  for (let i = 0; i < TICKS_PER_RUN; i++) {
    const result = await tick({ generation: state.generation, tickNo, runId: workflowRunId });
    if (result.stop) return { stopped: true, reason: result.reason, tickNo };
    tickNo++;
    await sleep(result.sleepSec * 1000);
  }

  const next: { runId: string } = await start(
    floorLoop,
    [{ generation: state.generation, tickNo, chain: state.chain + 1 }],
    { deploymentId: "latest" },
  );
  return { continuedAs: next.runId, tickNo };
}
