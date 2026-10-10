import { alpacaMode } from "@/lib/config";

const TRADING = {
  paper: "https://paper-api.alpaca.markets",
  live: "https://api.alpaca.markets",
};

export function alpacaConfigured() {
  return Boolean(process.env.ALPACA_KEY && process.env.ALPACA_SECRET);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!alpacaConfigured()) throw new Error("ALPACA_KEY / ALPACA_SECRET not set");
  const res = await fetch(`${TRADING[alpacaMode()]}${path}`, {
    ...init,
    headers: {
      "APCA-API-KEY-ID": process.env.ALPACA_KEY!,
      "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET!,
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Alpaca ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export type AlpacaAccount = {
  account_number: string;
  status: string;
  currency: string;
  equity: string;
  last_equity: string;
  cash: string;
  buying_power: string;
  daytrade_count: number;
  pattern_day_trader: boolean;
  shorting_enabled: boolean;
  trading_blocked: boolean;
  crypto_status?: string;
};

export type AlpacaClock = {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
};

export const alpaca = {
  account: () => call<AlpacaAccount>("/v2/account"),
  clock: () => call<AlpacaClock>("/v2/clock"),
};

// Fallback when keys are missing: NYSE regular hours, weekdays, no holidays.
export function roughMarketOpen(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  if (["Sat", "Sun"].includes(get("weekday"))) return false;
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}
