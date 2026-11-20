import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";

export async function proxy(request) {
  const token = await getToken({ req: request, secret: authOptions.secret });
  if (!token) {
    const loginUrl = new URL("/choose-role/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/owner/dashboard/:path*", "/worker/dashboard/:path*"],
};