import { ensureLoop } from "@/lib/loop/control";

export const dynamic = "force-dynamic";

// Daily Vercel cron: restart the loop if its heartbeat is stale.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const result = await ensureLoop({ by: "cron" });
  return Response.json(result);
}
