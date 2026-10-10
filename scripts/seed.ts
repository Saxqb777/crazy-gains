// Seeds default settings and the seven agents. Safe to re-run: never overwrites.
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db, schema } = await import("../lib/db");
  const c = await import("../lib/config");

  const defaults: Record<string, unknown> = {
    universe: c.DEFAULT_UNIVERSE,
    prices: c.DEFAULT_PRICES,
    budget: c.DEFAULT_BUDGET,
    risk: c.DEFAULT_RISK,
    cadence: c.DEFAULT_CADENCE,
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db().insert(schema.settings).values({ key, value }).onConflictDoNothing();
  }
  for (const [name, color] of Object.entries(c.AGENT_COLORS)) {
    await db().insert(schema.agents).values({ name, color }).onConflictDoNothing();
  }
  console.log("seeded", Object.keys(defaults).length, "settings,", Object.keys(c.AGENT_COLORS).length, "agents");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
