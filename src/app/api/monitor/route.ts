// Kept as a stub for compatibility. The actual monitoring is done by
// scripts/monitor.ts running in GitHub Actions (not via HTTP).
// This route returns the latest stored prices for a saved search token.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const search = await prisma.savedSearch.findUnique({
    where: { token },
    include: { priceRecords: { orderBy: { checkedAt: "desc" }, take: 50 } },
  });

  if (!search) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    latestPrice: search.priceRecords[0]?.cheapestPrice ?? null,
    history: search.priceRecords.map((r) => ({ checkedAt: r.checkedAt, price: r.cheapestPrice })),
    lastChecked: search.priceRecords[0]?.checkedAt ?? null,
  });
}
