import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db()
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .limit(1);
  return rows.length ? (rows[0].value as T) : fallback;
}

export async function setSetting(key: string, value: unknown) {
  await db()
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value, updatedAt: sql`now()` },
    });
}

// Shallow-merge a patch into a JSON setting in one statement.
export async function patchSetting(key: string, patch: Record<string, unknown>) {
  await db()
    .insert(schema.settings)
    .values({ key, value: patch })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: {
        value: sql`${schema.settings.value} || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: sql`now()`,
      },
    });
}
