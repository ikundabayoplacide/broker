import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCompany } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedCompany(request);
    if (!authResult || !authResult.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = authResult.companyId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    const trades = await prisma.companyTrade.findMany({
      where: { companyId },
      include: {
        targetCompany: {
          select: { name: true, symbol: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Map to match client trade response format
    const formattedTrades = trades.map(trade => ({
      ...trade,
      company: trade.targetCompany,
    }));

    return NextResponse.json({ trades: formattedTrades });
  } catch (error) {
    console.error("Error fetching trade history:", error);
    return NextResponse.json({ error: "Failed to fetch trade history" }, { status: 500 });
  }
}
