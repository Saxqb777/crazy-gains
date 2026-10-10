// Defaults. Every value here is seeded into the `settings` table and editable
// later from /settings. Code reads settings first and falls back to these.

export const MODEL = "claude-opus-5-5";

export const DEFAULT_UNIVERSE = {
  stocks: [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "AMD",
    "NFLX", "PLTR", "MU", "INTC", "ORCL", "CRM", "JPM", "BAC", "WFC", "XOM",
    "CVX", "UNH", "LLY", "COST", "WMT", "V",
  ],
  crypto: [
    "BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "DOGE/USD", "LTC/USD",
    "AVAX/USD", "LINK/USD", "BCH/USD", "DOT/USD",
  ],
};

// USD per million tokens. Editable.
export const DEFAULT_PRICES = {
  [MODEL]: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

export const DEFAULT_BUDGET = {
  dailyUsd: Number(process.env.DAILY_BUDGET_USD ?? 14),
  squeezeAt: 0.8, // debates need SCOUT 8+ above this share of budget
  maxCallsPerHour: 40,
};

export const DEFAULT_RISK = {
  maxRiskPerTradePct: 2,
  maxOpenPositions: 3,
  maxPerSymbol: 1,
  maxDailyLossPct: 6,
  maxWeeklyLossPct: 15,
  maxStopPctStock: 4,
  maxStopPctCrypto: 6,
  noTradeAfterOpenMin: 5,
  noTradeBeforeCloseMin: 10,
  pdtMaxDayTrades: 3,
};

// Loop cadence. Vercel Hobby includes 50k workflow events/month and each
// tick costs ~5 (one step = 3, one sleep = 2), so 60s ticks (~216k/month)
// do not fit. These defaults land around 25-30k/month, leaving room for
// debates. Set marketOpenSec/closedSec to 60 on a paid plan.
export const DEFAULT_CADENCE = {
  marketOpenSec: 300,
  closedSec: 600,
  withPositionsSec: 300,
  monthlyEventBudget: 45_000,
  eventsPerTick: 5,
  ticksPerRun: 24, // chain to a fresh run on the latest deployment after this many
};

export const AGENT_COLORS: Record<string, string> = {
  SCOUT: "#F2A93B",
  NEWSROOM: "#3FD0E0",
  CHARTIST: "#4ADE80",
  SKEPTIC: "#F0453A",
  JUDGE: "#F4F1EA",
  HISTORIAN: "#A78BFA",
  WARDEN: "#8A96A3",
};

export function alpacaMode(): "paper" | "live" {
  return process.env.ALPACA_MODE === "live" &&
    process.env.LIVE_CONFIRMED === "true"
    ? "live"
    : "paper";
}
