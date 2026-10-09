# THE PIT: autonomous multi agent trading floor

You are building THE PIT, a system where AI agents watch stocks and crypto, argue with each other about every trade, place trades on their own, learn from their mistakes, and the whole thing is watched live on one screen that looks insane.

I am the product owner. You are the architect and builder. Read this whole document before writing a single line of code. Then give me a build plan with phases and wait for my confirmation before you start Phase 1. At the end of every phase, stop, show me what works, and wait for my go before the next one.

## 1. Non negotiables

- Agents run on claude-opus-5-5 for every reasoning call. No downgrades without asking me.
- Broker: Alpaca. Paper account for week 1 (stocks + crypto in one account). Live account later with the same code, one env var flips it. Never place a live order unless ALPACA_MODE=live and LIVE_CONFIRMED=true are both set.
- Hosting: Vercel (Hobby plan) + Neon Postgres. Nothing else. No VPS, no laptop process.
- The agent loop must run 24/7 on Vercel using Vercel Workflow (the durable workflow SDK, "use workflow" and "use step"). The loop is: step tick, sleep, repeat forever. Sleep costs nothing. Each step must finish well under 300 seconds because that is the Hobby limit.
- Hard risk rules (section 6) are code, not prompts. Agents cannot argue past them.
- Every trade decision is fully logged: who said what, final verdict, confidence, the exact order sent, the fill, and later the post mortem.
- The dashboard must look like a real product someone would pay for. No AI slop (section 9 defines exactly what that means).
- Budget: $100 of Claude API credit for the week. Build a cost governor (section 7). If the governor says stop, the agents stop and the dashboard shows why.

## 2. Stack

- Next.js 15 (App Router), TypeScript, Tailwind. Deployed on Vercel.
- Vercel Workflow for the 24/7 agent loop. Install with `npx workflow@latest`.
- Neon Postgres via Drizzle ORM. All state, all logs, all memory lives here.
- Anthropic SDK with prompt caching on every agent call (big static system prompts and agent memory go in the cached prefix).
- Alpaca: Trading API (paper-api.alpaca.markets) + Market Data API (stocks and crypto bars, quotes, websocket not needed, polling is fine at our cadence).
- News: Finnhub (free tier, company news + sentiment), plus Alpaca News API. Crypto context: CoinGecko free API. Macro calendar: FRED or a simple static economic calendar table I can edit.
- Dashboard realtime: the browser polls `/api/state` every 1.5s with an ETag. Keep it simple and reliable. No websockets on Hobby.
- 3D: three.js (via @react-three/fiber + drei) for the agent war room. Charts: lightweight-charts (TradingView open source) for price panels.
- Fonts: JetBrains Mono for all numbers and logs, Space Grotesk for headings, Inter for body. No other fonts.

## 3. The agents

Seven agents. Each has its own system prompt file in `/agents/prompts/*.md`, its own memory file in Neon, its own reputation score, and its own voice in the debate. Write the prompts like you are briefing a sharp human professional, not a chatbot. They should be opinionated, concise, and allowed to be wrong.

### 3.1 SCOUT (market watcher)
- Runs every tick (every 60s for crypto, every 60s during US market hours for stocks, every 5 min for stocks after hours).
- Watches a universe: top 25 US large caps by volume + the 10 most liquid crypto pairs on Alpaca (BTC/USD, ETH/USD, SOL/USD, etc). I can edit the universe from the dashboard.
- Numeric scanning is code, not an LLM call: percentage move vs 15m/1h/4h, volume vs 20 period average, range expansion, gap at open, new session high/low, RSI(14) extremes, VWAP distance, crypto funding and open interest if free.
- When any symbol crosses a trigger, SCOUT calls Opus once with the numbers and writes a one paragraph "signal brief": what moved, how unusual it is, and whether it deserves a debate. Only signals it rates 6/10 or above open a debate.

### 3.2 NEWSROOM (why is it moving)
- Woken only when SCOUT opens a debate.
- Pulls the last 24h of news for the symbol from Finnhub + Alpaca News, plus sector and macro headlines.
- Answers one question: is this move explained by news, and is the news already priced in or still unfolding. Classifies the catalyst: earnings, guidance, macro, regulatory, rumor, liquidation cascade, nothing (pure technical).
- Flags "landmines": earnings in the next 48h, FOMC, CPI, token unlocks, ETF decisions. A landmine inside the planned holding window is a strong argument to skip.

### 3.3 CHARTIST (entry, exit, stop)
- Gets the last 300 bars on 5m, 15m and 1h plus the SCOUT brief.
- Must output a concrete plan as JSON: direction, entry (limit or market), stop loss price, take profit price(s), expected holding time, risk to reward ratio, and the one thing that would invalidate the setup.
- Must name the setup type from a fixed list (breakout, breakdown, mean reversion, VWAP reclaim, range fade, trend pullback, news momentum, liquidation bounce).
- Has a tool to compute indicators in code so it never estimates numbers by eye.

### 3.4 SKEPTIC (the one that matters)
- Its only job is to kill bad trades. It argues against whatever the others propose.
- It must attack on at least four fronts every time: the thesis, the timing, the risk to reward, and the position size. It also reads the HISTORIAN memory and throws past failures in their face ("last three VWAP reclaims on SOL lost, why is this different").
- It votes BUY, SELL, WAIT or SKIP with a confidence. It can demand a second round.
- SKEPTIC never gets reputation points for a trade that wins. It only gets points for correctly killing a trade that would have lost (we track shadow outcomes of skipped trades). This keeps it hostile.

### 3.5 RISK WARDEN (not an LLM)
- Pure code. Runs after the JUDGE and before the order.
- Enforces section 6. Rejects or resizes the order and logs the rule that fired. The dashboard shows a red stamp when it blocks something.

### 3.6 JUDGE (verdict)
- Reads the whole debate transcript and the agents' current reputation weights.
- Writes a verdict: EXECUTE / WAIT (with a re check time) / SKIP, a confidence 0 to 100, position size as a percent of max allowed, and a two line reason a human could read in five seconds.
- EXECUTE requires confidence 70 or above. WAIT re opens the debate later with the new bars. SKIP writes a shadow trade so we can learn if skipping was right.

### 3.7 HISTORIAN (learning loop)
- Runs after every closed trade and every expired shadow trade.
- Writes a post mortem: was the thesis right, was the entry right, was the stop right, did the exit leave money, did news hit, what would have been better. Max 200 words.
- Updates each agent's memory file with one or two durable lessons (not a transcript). Memory files are capped at 2,000 tokens; HISTORIAN rewrites and condenses them, it does not append forever.
- Updates reputation: each agent's vote is scored against the real outcome. Reputation is a rolling 30 trade score. The JUDGE uses reputation as weights.
- Once a day it writes a "state of the floor" summary: win rate, average R, best setup type, worst setup type, which agent is hot, which is cold, how much API money was burned per dollar made. This shows on the dashboard.

### 3.8 Regime detector (code + one Opus call per hour)
- Classifies the overall market as TRENDING, CHOPPY, NEWS DRIVEN or DEAD, separately for stocks and crypto, using realized volatility, breadth and VIX.
- Regime changes the aggression: in CHOPPY the JUDGE needs 80 confidence, in DEAD the floor sleeps and only SCOUT runs.

## 4. Debate protocol

1. SCOUT opens a debate with a signal brief. A debate row is created in Neon with status OPEN.
2. NEWSROOM and CHARTIST speak in parallel (two Opus calls at once).
3. SKEPTIC speaks, sees everything above plus memory.
4. If SKEPTIC demands a round two, CHARTIST and NEWSROOM each get one rebuttal of max 120 words. One rebuttal round only.
5. JUDGE rules.
6. RISK WARDEN checks the order. Order placed or blocked.
7. Everything is written to the `debate_messages` table as it happens so the dashboard shows the argument live, message by message.

Whole debate target: under 90 seconds and under 25k tokens. Measure it and show it on the dashboard.

## 5. Trade lifecycle and management

- Every order has a stop loss and a take profit attached on placement (bracket order on Alpaca where supported, otherwise the loop manages them).
- Every 60s the loop checks open positions: is the invalidation condition from CHARTIST hit, has news changed (NEWSROOM re check every 15 min for open positions), should the stop trail. Only CHARTIST + SKEPTIC debate exits, short form, max 300 tokens each.
- Intraday style: planned holding time 1 to 8 hours. Stocks are flattened 10 minutes before US close unless JUDGE explicitly approved an overnight hold with confidence 85+. Crypto can hold overnight.
- Shadow trades: every SKIP and every WAIT that never executes is tracked as if it were taken, with the CHARTIST plan. Expires after the planned holding time. This is how we learn whether the SKEPTIC is helping or just scared.

## 6. Hard risk rules (code, never prompts)

- Max risk per trade: 2% of account equity (the distance from entry to stop times size).
- Max open positions: 3. Max per symbol: 1.
- Max daily loss: 6% of equity. Hit it, the floor stops trading until next day and the dashboard goes into LOCKED mode.
- Max weekly loss: 15%. Hit it, everything stops and I must manually reset.
- No order without a stop loss. No stop wider than 4% for stocks or 6% for crypto.
- No new stock trades in the first 5 minutes after open or last 10 before close.
- Kill switch: a big button on the dashboard and a `/api/kill` route. Cancels all open orders, flattens all positions, pauses the workflow. Needs a typed confirmation word.
- Pattern day trading awareness: on a live US stock account under $25k, only 3 day trades per rolling 5 days are allowed. Track the counter, show it on the dashboard, and refuse the 4th. Crypto has no such rule, so with $50 live, crypto will do most of the work.
- Position sizing with $50: Alpaca supports fractional shares and small crypto notional, so size by dollars, never by whole shares.

## 7. Cost governor

- Track every API call: agent, model, input tokens, cached tokens, output tokens, dollars. Opus 5.5 is $4 per million input, $20 per million output, $0.20 per million cached input. Store the price table in config so I can edit it.
- Daily budget default $14 (so $100 lasts 7 days). Show burn rate, projected end of budget, and dollars spent per debate on the dashboard.
- Prompt caching everywhere: system prompts, agent memory, universe config and the price table are a cached prefix. Target 70%+ of input tokens as cache reads.
- When daily spend hits 80% of budget: debates need a SCOUT score of 8+ to open. At 100%: SCOUT keeps scanning (it is code) but no Opus calls until the day resets, and the dashboard shows "AGENTS ASLEEP: BUDGET".
- Never let a bug loop burn credit: max 40 Opus calls per hour, hard cap in code.

## 8. Data model (Neon)

Tables at minimum: `agents` (name, prompt version, reputation, memory text), `ticks`, `signals`, `debates`, `debate_messages`, `verdicts`, `orders`, `fills`, `positions`, `trades` (closed, with R multiple and PnL), `shadow_trades`, `post_mortems`, `daily_summaries`, `api_calls` (cost tracking), `risk_events`, `regimes`, `settings` (universe, budget, mode). Every row has created_at. Use Drizzle migrations.

## 9. The dashboard: one screen, live, and it must look insane

Route `/` is the floor. One screen, no scrolling on a 1440p monitor, dark only.

### What AI slop means here and is banned
- No purple to blue gradients, no glassmorphism card grids, no rounded cards floating on a gradient blob, no sparkle icons, no "AI" badges, no stock illustration of a robot, no emoji in the UI, no generic SaaS hero layout, no rainbow charts.
- No layout where everything has the same visual weight. Hierarchy or nothing.

### Direction
Think Bloomberg terminal meets a mission control ops room meets a sci fi film UI. Near black background (#0A0B0D), one warm off white for text, and each agent owns exactly one accent colour used nowhere else: SCOUT amber, NEWSROOM cyan, CHARTIST green, SKEPTIC red, JUDGE white, HISTORIAN violet, RISK WARDEN a cold steel grey. Thin 1px lines, dense information, monospace numerals, tabular figures, subtle scanline or film grain texture at 3% opacity, and motion that means something (a pulse is a heartbeat, a beam is a message, a flash is a fill).

### Layout (12 column grid)
- Center (columns 4 to 9, top 60% of height): THE WAR ROOM. A three.js scene. Each agent is a sphere made of orbiting particles in its colour, resting in a loose ring. Idle agents breathe slowly. A thinking agent's particles spin faster and tighten. When an agent sends a debate message, a stream of particles travels from it to the JUDGE node in the centre, and the message appears as a short floating caption that fades. When the JUDGE rules EXECUTE the whole ring flashes once and a trade beam fires to the ticker. When SKEPTIC kills a trade the ring dims and SKEPTIC pulses red twice. When RISK WARDEN blocks something a grey cage briefly draws around the order. Camera drifts slowly, the user can drag to orbit. Target 60fps on a MacBook, degrade particle count on weak GPUs.
- Left column (columns 1 to 3): THE ARGUMENT. Live debate transcript, newest at the bottom, typewriter reveal, each message tagged with the agent colour, vote badge and confidence. Above it: the current signal brief and the CHARTIST plan rendered as a mini card with entry / stop / TP as numbers and a tiny bar showing R:R.
- Right column (columns 10 to 12): THE BOOK. Open positions with live PnL, unrealized R, time in trade, next re check time, and a thin sparkline. Below: today's closed trades and shadow trades with outcome. Below: equity curve for the week.
- Bottom strip (full width, 40% height, split in three): left the price chart of the symbol under debate with entry/stop/TP lines drawn (lightweight-charts); middle THE FLOOR STATE: regime, budget burn, tokens per debate, debates today, win rate, average R, kill switch, PDT counter, mode (PAPER / LIVE) in a big label; right THE LEDGER: agent reputation as seven horizontal bars that animate on change, plus the latest HISTORIAN daily summary.
- Top bar: system name, clock in UTC and Dubai time, Alpaca connection dot, workflow heartbeat dot (goes red if the last tick is older than 3 minutes), equity, day PnL, week PnL.

### Other screens
- `/trade/[id]`: the full story of one trade: debate, verdict, order, fills, chart replay with markers, post mortem.
- `/agents`: each agent's prompt version, memory text (editable by me), reputation history chart, and a button to clear memory.
- `/settings`: universe editor, budget, risk limits, mode switch (paper/live with the double confirmation), kill switch.
- Sound: optional, off by default, a soft tick on message, a low tone on fill, nothing else.

### Quality bar
- Before showing me the dashboard, take screenshots of it at 1440p with a fake debate running and look at them yourself. If it looks like a template, redo it.
- Build a `/demo` mode that replays a recorded debate from a JSON fixture so I can see the visuals without waiting for the market.

## 10. Env vars

ANTHROPIC_API_KEY, ALPACA_KEY, ALPACA_SECRET, ALPACA_MODE (paper|live), LIVE_CONFIRMED, FINNHUB_KEY, DATABASE_URL, DAILY_BUDGET_USD, KILL_WORD, DASHBOARD_PASSWORD (basic auth on every route, this is my money).

## 11. Build order (stop for my confirmation after each phase)

Phase 0: Plan. Repo layout, schema, the exact Vercel Workflow loop design, how you will keep every step under 300s, and how the cost governor is wired. Ask me anything unclear. Wait.

Phase 1: Skeleton. Next.js app on Vercel, Neon schema migrated, Alpaca paper connected (show me my paper account equity on a plain page), one workflow that ticks every 60s and writes a heartbeat row. Prove the loop survives a redeploy.

Phase 2: SCOUT + data. Universe, indicator engine, trigger rules, signal briefs written to Neon. Show me a day of signals in a plain table.

Phase 3: The debate. All seven agents, the protocol, the JUDGE, RISK WARDEN, bracket orders on paper. Run it on real market data. Show me three full debates with their verdicts and the cost of each.

Phase 4: Lifecycle + learning. Position management, exits, shadow trades, HISTORIAN post mortems, reputation, daily summary.

Phase 5: The dashboard. Everything in section 9. Demo mode first, then live.

Phase 6: Hardening. Kill switch tested, budget caps tested by faking spend, PDT counter, auth, error alerts (if a step fails three times in a row, write a risk event and show it red on the top bar). Then a 7 day paper run with a checklist of what we are measuring.

Phase 7 (later, after I review the week): live mode with $50, crypto first.

## 12. Definition of done for the week

- Floor runs 7 days without me touching it.
- At least 30 debates, every one fully logged with cost.
- Dashboard shows a live debate end to end and I can explain any trade in 10 seconds from the `/trade/[id]` page.
- HISTORIAN has rewritten every agent's memory at least five times and reputation has moved.
- Total API spend under $100.
- I have a one page report of win rate, average R, the setup types that worked, whether SKEPTIC's kills were right, and whether this deserves real money.

Start with Phase 0. Do not write code yet.
