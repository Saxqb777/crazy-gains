import { ensureLoop } from "@/lib/loop/control";

export const dynamic = "force-dynamic";

// Force a fresh loop run (also used right after a deploy).
export async function POST() {
  const result = await ensureLoop({ force: true, by: "api" });
  return Response.json(result);
}
