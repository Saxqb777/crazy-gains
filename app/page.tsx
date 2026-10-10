import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { alpaca, alpacaConfigured, type AlpacaAccount } from "@/lib/alpaca/client";
import { alpacaMode } from "@/lib/config";
import { getLease, isStale } from "@/lib/loop/state";

export const dynamic = "force-dynamic";

// Phase 1 status page. Plain on purpose; the real floor arrives in Phase 5.
export default async function Home() {
  let account: AlpacaAccount | null = null;
  let accountError: string | null = null;
  if (alpacaConfigured()) {
    try {
      account = await alpaca.account();
    } catch (err) {
      accountError = String(err);
    }
  } else {
    accountError = "ALPACA_KEY / ALPACA_SECRET not set";
  }

  const lease = await getLease();
  const ticks = await db()
    .select()
    .from(schema.ticks)
    .orderBy(desc(schema.ticks.id))
    .limit(30);

  const heartbeatOk = !isStale(lease);

  return (
    <main className="p-6 font-mono text-sm space-y-6">
      <h1 className="text-lg">THE PIT / phase 1 status</h1>

      <section>
        <h2 className="opacity-60">alpaca ({alpacaMode()})</h2>
        {account ? (
          <table>
            <tbody>
              <Row k="equity" v={`$${Number(account.equity).toFixed(2)}`} />
              <Row k="cash" v={`$${Number(account.cash).toFixed(2)}`} />
              <Row k="buying power" v={`$${Number(account.buying_power).toFixed(2)}`} />
              <Row k="status" v={account.status} />
              <Row k="day trades (5d)" v={String(account.daytrade_count)} />
              <Row k="shorting enabled" v={String(account.shorting_enabled)} />
              <Row k="crypto" v={account.crypto_status ?? "-"} />
            </tbody>
          </table>
        ) : (
          <p className="text-red-400">{accountError}</p>
        )}
      </section>

      <section>
        <h2 className="opacity-60">loop</h2>
        <table>
          <tbody>
            <Row k="heartbeat" v={heartbeatOk ? "OK" : "STALE"} />
            <Row k="generation" v={String(lease?.generation ?? "-")} />
            <Row k="run" v={lease?.runId ?? "-"} />
            <Row k="last tick" v={lease?.lastTickAt ?? "-"} />
            <Row k="next sleep" v={lease?.lastSleepSec ? `${lease.lastSleepSec}s` : "-"} />
            <Row k="deployment" v={lease?.lastDeploymentId ?? "-"} />
            <Row k="paused" v={String(lease?.paused ?? false)} />
          </tbody>
        </table>
        <form action="/api/loop/start" method="post" className="mt-2">
          <button className="border px-2 py-1">force restart loop</button>
        </form>
      </section>

      <section>
        <h2 className="opacity-60">last 30 heartbeats</h2>
        <table className="w-full">
          <thead className="opacity-60 text-left">
            <tr>
              <th>time (utc)</th><th>gen</th><th>tick</th><th>run</th><th>deployment</th>
              <th>market</th><th>ms</th><th>sleep</th><th>ok</th><th>equity</th>
            </tr>
          </thead>
          <tbody>
            {ticks.map((t) => (
              <tr key={t.id}>
                <td>{t.startedAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                <td>{t.generation}</td>
                <td>{t.tickNo}</td>
                <td>{t.runId?.slice(-8)}</td>
                <td>{t.deploymentId?.slice(-8)}</td>
                <td>{t.marketOpen ? "open" : "closed"}</td>
                <td>{t.durationMs}</td>
                <td>{t.nextSleepSec}</td>
                <td>{t.ok ? "ok" : t.error}</td>
                <td>{(t.notes as { equity?: number } | null)?.equity ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td className="pr-6 opacity-60">{k}</td>
      <td>{v}</td>
    </tr>
  );
}
