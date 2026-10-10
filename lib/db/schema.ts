import {
  pgTable,
  text,
  integer,
  bigserial,
  bigint,
  boolean,
  doublePrecision,
  jsonb,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });
const id = () => bigserial("id", { mode: "number" }).primaryKey();
const ref = (name: string) => bigint(name, { mode: "number" });

// Key/value config: universe, budget, risk limits, mode, price table, loop lease.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  createdAt: createdAt(),
});

export const agents = pgTable("agents", {
  name: text("name").primaryKey(), // SCOUT, NEWSROOM, ...
  color: text("color").notNull(),
  promptVersion: integer("prompt_version").notNull().default(1),
  reputation: doublePrecision("reputation").notNull().default(50),
  memory: text("memory").notNull().default(""),
  memoryVersion: integer("memory_version").notNull().default(0),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  createdAt: createdAt(),
});

export const agentMemoryHistory = pgTable("agent_memory_history", {
  id: id(),
  agent: text("agent").notNull(),
  version: integer("version").notNull(),
  memory: text("memory").notNull(),
  reason: text("reason"),
  createdAt: createdAt(),
});

export const reputationHistory = pgTable("reputation_history", {
  id: id(),
  agent: text("agent").notNull(),
  reputation: doublePrecision("reputation").notNull(),
  delta: doublePrecision("delta").notNull(),
  tradeId: ref("trade_id"),
  shadowTradeId: ref("shadow_trade_id"),
  createdAt: createdAt(),
});

// One row per loop tick: the heartbeat.
export const ticks = pgTable(
  "ticks",
  {
    id: id(),
    runId: text("run_id"),
    generation: integer("generation").notNull(),
    deploymentId: text("deployment_id"),
    tickNo: integer("tick_no").notNull(),
    startedAt: ts("started_at").notNull(),
    durationMs: integer("duration_ms").notNull(),
    marketOpen: boolean("market_open").notNull(),
    nextSleepSec: integer("next_sleep_sec").notNull(),
    ok: boolean("ok").notNull(),
    error: text("error"),
    notes: jsonb("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("ticks_created_idx").on(t.createdAt)],
);

export const signals = pgTable(
  "signals",
  {
    id: id(),
    symbol: text("symbol").notNull(),
    assetClass: text("asset_class").notNull(), // stock | crypto
    triggers: jsonb("triggers").notNull(),
    metrics: jsonb("metrics").notNull(),
    score: integer("score"),
    brief: text("brief"),
    openedDebate: boolean("opened_debate").notNull().default(false),
    debateId: ref("debate_id"),
    createdAt: createdAt(),
  },
  (t) => [index("signals_created_idx").on(t.createdAt)],
);

export const debates = pgTable(
  "debates",
  {
    id: id(),
    signalId: ref("signal_id"),
    symbol: text("symbol").notNull(),
    assetClass: text("asset_class").notNull(),
    status: text("status").notNull().default("OPEN"), // OPEN RULED EXECUTED BLOCKED SKIPPED WAIT ERROR
    regime: text("regime"),
    rounds: integer("rounds").notNull().default(1),
    startedAt: ts("started_at").notNull().defaultNow(),
    endedAt: ts("ended_at"),
    durationMs: integer("duration_ms"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensCached: integer("tokens_cached").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    costUsd: doublePrecision("cost_usd").notNull().default(0),
    recheckAt: ts("recheck_at"),
    createdAt: createdAt(),
  },
  (t) => [index("debates_created_idx").on(t.createdAt)],
);

export const debateMessages = pgTable(
  "debate_messages",
  {
    id: id(),
    debateId: ref("debate_id").notNull(),
    agent: text("agent").notNull(),
    round: integer("round").notNull().default(1),
    kind: text("kind").notNull(), // brief argument rebuttal verdict warden
    content: text("content").notNull(),
    payload: jsonb("payload"),
    vote: text("vote"), // BUY SELL WAIT SKIP
    confidence: integer("confidence"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    costUsd: doublePrecision("cost_usd"),
    createdAt: createdAt(),
  },
  (t) => [index("debate_messages_debate_idx").on(t.debateId)],
);

export const verdicts = pgTable("verdicts", {
  id: id(),
  debateId: ref("debate_id").notNull(),
  decision: text("decision").notNull(), // EXECUTE WAIT SKIP
  confidence: integer("confidence").notNull(),
  sizePct: doublePrecision("size_pct"),
  reason: text("reason").notNull(),
  plan: jsonb("plan"),
  recheckAt: ts("recheck_at"),
  createdAt: createdAt(),
});

export const orders = pgTable("orders", {
  id: id(),
  debateId: ref("debate_id"),
  verdictId: ref("verdict_id"),
  positionId: ref("position_id"),
  purpose: text("purpose").notNull(), // entry stop take_profit exit flatten
  alpacaOrderId: text("alpaca_order_id"),
  clientOrderId: text("client_order_id"),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class").notNull(),
  side: text("side").notNull(),
  type: text("type").notNull(),
  notional: doublePrecision("notional"),
  qty: doublePrecision("qty"),
  limitPrice: doublePrecision("limit_price"),
  stopPrice: doublePrecision("stop_price"),
  takeProfit: doublePrecision("take_profit"),
  status: text("status").notNull(),
  mode: text("mode").notNull(), // paper | live
  request: jsonb("request"),
  response: jsonb("response"),
  error: text("error"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  createdAt: createdAt(),
});

export const fills = pgTable("fills", {
  id: id(),
  orderId: ref("order_id"),
  alpacaOrderId: text("alpaca_order_id"),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  qty: doublePrecision("qty").notNull(),
  price: doublePrecision("price").notNull(),
  filledAt: ts("filled_at").notNull(),
  raw: jsonb("raw"),
  createdAt: createdAt(),
});

export const positions = pgTable("positions", {
  id: id(),
  debateId: ref("debate_id"),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class").notNull(),
  side: text("side").notNull(),
  qty: doublePrecision("qty").notNull(),
  entryPrice: doublePrecision("entry_price").notNull(),
  stopPrice: doublePrecision("stop_price").notNull(),
  takeProfit: doublePrecision("take_profit"),
  invalidation: text("invalidation"),
  setupType: text("setup_type"),
  plannedExitAt: ts("planned_exit_at"),
  overnightOk: boolean("overnight_ok").notNull().default(false),
  status: text("status").notNull().default("OPEN"),
  nextRecheckAt: ts("next_recheck_at"),
  lastNewsCheckAt: ts("last_news_check_at"),
  openedAt: ts("opened_at").notNull().defaultNow(),
  closedAt: ts("closed_at"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  createdAt: createdAt(),
});

export const trades = pgTable("trades", {
  id: id(),
  positionId: ref("position_id"),
  debateId: ref("debate_id"),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class").notNull(),
  side: text("side").notNull(),
  setupType: text("setup_type"),
  qty: doublePrecision("qty").notNull(),
  entryPrice: doublePrecision("entry_price").notNull(),
  exitPrice: doublePrecision("exit_price").notNull(),
  pnlUsd: doublePrecision("pnl_usd").notNull(),
  rMultiple: doublePrecision("r_multiple").notNull(),
  exitReason: text("exit_reason"),
  isDayTrade: boolean("is_day_trade").notNull().default(false),
  openedAt: ts("opened_at").notNull(),
  closedAt: ts("closed_at").notNull(),
  createdAt: createdAt(),
});

export const shadowTrades = pgTable("shadow_trades", {
  id: id(),
  debateId: ref("debate_id"),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class").notNull(),
  side: text("side").notNull(),
  setupType: text("setup_type"),
  reason: text("reason").notNull(), // SKIP WAIT_EXPIRED BLOCKED_SHORT WARDEN
  entry: doublePrecision("entry").notNull(),
  stop: doublePrecision("stop").notNull(),
  takeProfit: doublePrecision("take_profit"),
  expiresAt: ts("expires_at").notNull(),
  status: text("status").notNull().default("OPEN"), // OPEN WIN LOSS EXPIRED
  outcomePrice: doublePrecision("outcome_price"),
  rMultiple: doublePrecision("r_multiple"),
  resolvedAt: ts("resolved_at"),
  createdAt: createdAt(),
});

export const postMortems = pgTable("post_mortems", {
  id: id(),
  tradeId: ref("trade_id"),
  shadowTradeId: ref("shadow_trade_id"),
  content: text("content").notNull(),
  lessons: jsonb("lessons"),
  costUsd: doublePrecision("cost_usd"),
  createdAt: createdAt(),
});

export const dailySummaries = pgTable(
  "daily_summaries",
  {
    id: id(),
    day: date("day").notNull(),
    content: text("content").notNull(),
    stats: jsonb("stats"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("daily_summaries_day_idx").on(t.day)],
);

// Every Claude call, for the cost governor.
export const apiCalls = pgTable(
  "api_calls",
  {
    id: id(),
    agent: text("agent").notNull(),
    model: text("model").notNull(),
    purpose: text("purpose"),
    debateId: ref("debate_id"),
    inputTokens: integer("input_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: doublePrecision("cost_usd").notNull().default(0),
    durationMs: integer("duration_ms"),
    ok: boolean("ok").notNull().default(true),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("api_calls_created_idx").on(t.createdAt)],
);

export const riskEvents = pgTable(
  "risk_events",
  {
    id: id(),
    rule: text("rule").notNull(),
    severity: text("severity").notNull(), // info warn block critical
    symbol: text("symbol"),
    debateId: ref("debate_id"),
    orderId: ref("order_id"),
    message: text("message").notNull(),
    payload: jsonb("payload"),
    createdAt: createdAt(),
  },
  (t) => [index("risk_events_created_idx").on(t.createdAt)],
);

export const regimes = pgTable("regimes", {
  id: id(),
  assetClass: text("asset_class").notNull(),
  regime: text("regime").notNull(), // TRENDING CHOPPY NEWS_DRIVEN DEAD
  metrics: jsonb("metrics"),
  rationale: text("rationale"),
  createdAt: createdAt(),
});

// Day trades for the PDT counter (rolling 5 business days).
export const pdtLog = pgTable("pdt_log", {
  id: id(),
  symbol: text("symbol").notNull(),
  tradeId: ref("trade_id"),
  openedAt: ts("opened_at").notNull(),
  closedAt: ts("closed_at").notNull(),
  createdAt: createdAt(),
});
