import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
type Ctx = { params: Promise<Record<string, string>> };

/** JSON.stringify replacer that renders BigInt (Prisma) as Number. */
export function jsonSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data: jsonSafe(data) }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

type Handler = (req: Request, user: CurrentUser, ctx: Ctx) => Promise<Response> | Response;

/** Wrap a route handler so it only runs for authenticated users. */
export function withAuth(handler: Handler) {
  return async (req: Request, ctx: Ctx) => {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", 401);
    return handler(req, user, ctx);
  };
}

/** Wrap a route handler so it only runs for admins. */
export function withAdmin(handler: Handler) {
  return async (req: Request, ctx: Ctx) => {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", 401);
    if (user.role !== "admin") return fail("Forbidden — admin only", 403);
    return handler(req, user, ctx);
  };
}
