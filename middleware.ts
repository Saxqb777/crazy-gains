import { NextResponse, type NextRequest } from "next/server";

// Basic auth on every route. Fails closed if DASHBOARD_PASSWORD is unset.
// Workflow internals and the cron route are excluded by the matcher; the cron
// route checks CRON_SECRET itself.
export function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    return new NextResponse("DASHBOARD_PASSWORD is not set", { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const supplied = decoded.slice(decoded.indexOf(":") + 1);
    if (supplied === password) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="THE PIT"' },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known/workflow/|api/cron/).*)",
  ],
};
