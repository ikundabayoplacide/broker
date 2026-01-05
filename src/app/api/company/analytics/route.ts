import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCompany } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(request);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    const now = new Date();
    const startDate = period === "year" 
      ? new Date(now.getFullYear(), 0, 1) 
      : new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch company trades for the company within the period
    const trades = await prisma.companyTrade.findMany({
      where: {
        companyId: auth.companyId,
        status: "EXECUTED",
        executedAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        executedAt: true,
        quantity: true,
        totalAmount: true,
        type: true,
      },
      orderBy: { executedAt: "asc" },
    });

    // Group trades by date
    const groupedData = new Map();
    
    trades.forEach((trade) => {
      const date = trade.executedAt?.toISOString().split('T')[0];
      if (!date) return;

      if (!groupedData.has(date)) {
        groupedData.set(date, {
          date,
          totalVolume: 0,
          totalValue: 0,
          buyVolume: 0,
          sellVolume: 0,
          tradeCount: 0,
        });
      }

      const dayData = groupedData.get(date);
      dayData.totalVolume += trade.quantity;
      dayData.totalValue += Number(trade.totalAmount);
      dayData.tradeCount += 1;

      if (trade.type === "BUY") {
        dayData.buyVolume += trade.quantity;
      } else {
        dayData.sellVolume += trade.quantity;
      }
    });

    // Fill missing dates with zero values
    const result = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = groupedData.get(dateStr) || {
        date: dateStr,
        totalVolume: 0,
        totalValue: 0,
        buyVolume: 0,
        sellVolume: 0,
        tradeCount: 0,
      };

      result.push({
        ...dayData,
        displayDate: currentDate.toLocaleDateString('en', { 
          month: 'short', 
          day: 'numeric',
          ...(period === "year" && { year: 'numeric' })
        }),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const summary = {
      totalTrades: trades.length,
      totalVolume: trades.reduce((sum, t) => sum + t.quantity, 0),
      totalValue: trades.reduce((sum, t) => sum + Number(t.totalAmount), 0),
    };
    
    return NextResponse.json({
      period,
      data: result,
      summary,
    });
  } catch (error) {
    console.error("Error fetching trading analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}