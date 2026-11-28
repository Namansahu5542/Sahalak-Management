import { NextResponse } from "next/server";
import { z } from "zod";
import { ROLES, withRole } from "@/app/lib/auth/require-role";
import { getMarketStalls } from "@/app/lib/markets";

export const GET = withRole([ROLES.USER, ROLES.OWNER], async (request, { user }) => {
  const marketId = new URL(request.url).searchParams.get("marketId");
  const parsed = z.uuid().safeParse(marketId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid market." }, { status: 400 });
  }

  try {
    const stalls = await getMarketStalls(parsed.data, { ownerId: user.id });
    return NextResponse.json({ stalls }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load stalls for owner setup", { name: error?.name, code: error?.code });
    const message = error?.code === "42P01" || error?.code === "42703"
      ? "Market setup is not configured. Apply db/006-market.sql and add the market seed data."
      : "Could not load this market's stalls right now. Please retry.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
});
