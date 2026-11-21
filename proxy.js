import { NextResponse } from "next/server";
import { proxy as auth } from "@/app/lib/auth/proxy";

export default auth((request) => {
  const isProtected =
    request.nextUrl.pathname.startsWith("/owner/setup") ||
    request.nextUrl.pathname.startsWith("/owner/dashboard") ||
    request.nextUrl.pathname.startsWith("/worker/dashboard") ||
    request.nextUrl.pathname.startsWith("/dashboard");

  if (isProtected && !request.auth) {
    const loginUrl = new URL("/choose-role/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/owner/setup/:path*", "/dashboard/:path*", "/owner/dashboard/:path*", "/worker/dashboard/:path*"],
};
