import { DEFAULT_CADENCE } from "@/lib/config";

export type Cadence = typeof DEFAULT_CADENCE;

// Next sleep in seconds. Stretches when the month's projected workflow events
// would exceed the budget (80% reserved for ticks, the rest for debates).
export function nextSleepSec(opts: {
  cadence: Cadence;
  marketOpen: boolean;
  openPositions: number;
  ticksThisMonth: number;
  now?: Date;
}) {
  const { cadence, marketOpen, openPositions, ticksThisMonth } = opts;
  const now = opts.now ?? new Date();
  let base = marketOpen ? cadence.marketOpenSec : cadence.closedSec;
  if (openPositions > 0) base = Math.min(base, cadence.withPositionsSec);

  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const monthEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const elapsed = Math.max((now.getTime() - monthStart) / (monthEnd - monthStart), 0.02);
  const projected = (ticksThisMonth * cadence.eventsPerTick) / elapsed;
  const allowance = cadence.monthlyEventBudget * 0.8;
  const stretch = projected > allowance ? projected / allowance : 1;

  return Math.min(Math.round(base * stretch), 1800);
}
