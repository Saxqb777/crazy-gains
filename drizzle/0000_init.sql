CREATE TABLE "agent_memory_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agent" text NOT NULL,
	"version" integer NOT NULL,
	"memory" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"name" text PRIMARY KEY NOT NULL,
	"color" text NOT NULL,
	"prompt_version" integer DEFAULT 1 NOT NULL,
	"reputation" double precision DEFAULT 50 NOT NULL,
	"memory" text DEFAULT '' NOT NULL,
	"memory_version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agent" text NOT NULL,
	"model" text NOT NULL,
	"purpose" text,
	"debate_id" bigint,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" double precision DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"ok" boolean DEFAULT true NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_summaries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"content" text NOT NULL,
	"stats" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debate_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"debate_id" bigint NOT NULL,
	"agent" text NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"payload" jsonb,
	"vote" text,
	"confidence" integer,
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_usd" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"signal_id" bigint,
	"symbol" text NOT NULL,
	"asset_class" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"regime" text,
	"rounds" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_ms" integer,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_cached" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cost_usd" double precision DEFAULT 0 NOT NULL,
	"recheck_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint,
	"alpaca_order_id" text,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"qty" double precision NOT NULL,
	"price" double precision NOT NULL,
	"filled_at" timestamp with time zone NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"debate_id" bigint,
	"verdict_id" bigint,
	"position_id" bigint,
	"purpose" text NOT NULL,
	"alpaca_order_id" text,
	"client_order_id" text,
	"symbol" text NOT NULL,
	"asset_class" text NOT NULL,
	"side" text NOT NULL,
	"type" text NOT NULL,
	"notional" double precision,
	"qty" double precision,
	"limit_price" double precision,
	"stop_price" double precision,
	"take_profit" double precision,
	"status" text NOT NULL,
	"mode" text NOT NULL,
	"request" jsonb,
	"response" jsonb,
	"error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdt_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"trade_id" bigint,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"debate_id" bigint,
	"symbol" text NOT NULL,
	"asset_class" text NOT NULL,
	"side" text NOT NULL,
	"qty" double precision NOT NULL,
	"entry_price" double precision NOT NULL,
	"stop_price" double precision NOT NULL,
	"take_profit" double precision,
	"invalidation" text,
	"setup_type" text,
	"planned_exit_at" timestamp with time zone,
	"overnight_ok" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"next_recheck_at" timestamp with time zone,
	"last_news_check_at" timestamp with time zone,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_mortems" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"trade_id" bigint,
	"shadow_trade_id" bigint,
	"content" text NOT NULL,
	"lessons" jsonb,
	"cost_usd" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regimes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"asset_class" text NOT NULL,
	"regime" text NOT NULL,
	"metrics" jsonb,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reputation_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agent" text NOT NULL,
	"reputation" double precision NOT NULL,
	"delta" double precision NOT NULL,
	"trade_id" bigint,
	"shadow_trade_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rule" text NOT NULL,
	"severity" text NOT NULL,
	"symbol" text,
	"debate_id" bigint,
	"order_id" bigint,
	"message" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shadow_trades" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"debate_id" bigint,
	"symbol" text NOT NULL,
	"asset_class" text NOT NULL,
	"side" text NOT NULL,
	"setup_type" text,
	"reason" text NOT NULL,
	"entry" double precision NOT NULL,
	"stop" double precision NOT NULL,
	"take_profit" double precision,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"outcome_price" double precision,
	"r_multiple" double precision,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"asset_class" text NOT NULL,
	"triggers" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"score" integer,
	"brief" text,
	"opened_debate" boolean DEFAULT false NOT NULL,
	"debate_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" text,
	"generation" integer NOT NULL,
	"deployment_id" text,
	"tick_no" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"market_open" boolean NOT NULL,
	"next_sleep_sec" integer NOT NULL,
	"ok" boolean NOT NULL,
	"error" text,
	"notes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"position_id" bigint,
	"debate_id" bigint,
	"symbol" text NOT NULL,
	"asset_class" text NOT NULL,
	"side" text NOT NULL,
	"setup_type" text,
	"qty" double precision NOT NULL,
	"entry_price" double precision NOT NULL,
	"exit_price" double precision NOT NULL,
	"pnl_usd" double precision NOT NULL,
	"r_multiple" double precision NOT NULL,
	"exit_reason" text,
	"is_day_trade" boolean DEFAULT false NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verdicts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"debate_id" bigint NOT NULL,
	"decision" text NOT NULL,
	"confidence" integer NOT NULL,
	"size_pct" double precision,
	"reason" text NOT NULL,
	"plan" jsonb,
	"recheck_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "api_calls_created_idx" ON "api_calls" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_summaries_day_idx" ON "daily_summaries" USING btree ("day");--> statement-breakpoint
CREATE INDEX "debate_messages_debate_idx" ON "debate_messages" USING btree ("debate_id");--> statement-breakpoint
CREATE INDEX "debates_created_idx" ON "debates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "risk_events_created_idx" ON "risk_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "signals_created_idx" ON "signals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ticks_created_idx" ON "ticks" USING btree ("created_at");