import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/auth";
import { sql } from "@/app/lib/db";

export const ROLES = Object.freeze({ USER: "user", OWNER: "owner", ADMIN: "admin" });

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 401 = we don't know who you are. 403 = we know who you are, but you may not do this.
export class AuthError extends Error {
  constructor(status) {
    super(status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
    this.name = "AuthError";
    this.status = status;
  }
}

// Who is making this request? Reads the role from the DATABASE, not the JWT,
// so a promoted/demoted/deleted account takes effect immediately.
// React's cache() makes this run once per request, however many callers there are.
const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) return null;

  const [user] = await sql`
    select id, name, email, role
    from users
    where id = ${id}
    limit 1`;
  return user ?? null;
});

// Core check shared by pages and APIs. An empty list means "any signed-in user".
async function authorize(roles) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401);
  if (roles.length > 0 && !roles.includes(user.role)) throw new AuthError(403);
  return user;
}

/**
 * For pages, layouts and server actions.
 *   const user = await requireRole("owner", { callbackUrl: "/owner/dashboard" });
 *   const user = await requireRole(["owner", "admin"]);
 *   const user = await requireRole();            // any signed-in user
 * Redirects instead of returning when the check fails.
 * With cacheComponents, call it inside a <Suspense> boundary (it reads cookies).
 */
export async function requireRole(roles = [], { callbackUrl } = {}) {
  try {
    return await authorize([].concat(roles));
  } catch (err) {
    if (!(err instanceof AuthError)) throw err;
    if (err.status === 401) {
      const query = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "";
      redirect(`/choose-role/login${query}`);
    }
    redirect("/");
  }
}

/**
 * For route handlers. Wraps the handler so it only runs for allowed roles
 * and receives the verified user.
 *   export const POST = withRole("admin", async (request, { user }) => { ... });
 * Failures become JSON 401/403 responses.
 */
export function withRole(roles, handler) {
  const allowed = [].concat(roles ?? []);
  return async (request, context) => {
    try {
      const user = await authorize(allowed);
      return await handler(request, { ...context, user });
    } catch (err) {
      if (err instanceof AuthError) {
        const error =
          err.status === 401
            ? "Please sign in again to continue."
            : "You do not have permission to do this.";
        return NextResponse.json({ error }, { status: err.status });
      }
      throw err;
    }
  };
}