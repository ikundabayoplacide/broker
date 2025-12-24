import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request as any);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current date and calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Last 7 days including today

    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 5); // Last 6 months including current month

    // Fetch daily trading data for the last 7 days
    const dailyTrades = await prisma.trade.findMany({
      where: {
        status: "EXECUTED",
        executedAt: {
          gte: sevenDaysAgo,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // End of today
        },
      },
      select: {
        totalAmount: true,
        executedAt: true,
      },
    });

    // Fetch monthly trading data for the last 6 months
    const monthlyTrades = await prisma.trade.findMany({
      where: {
        status: "EXECUTED",
        executedAt: {
          gte: sixMonthsAgo,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: {
        totalAmount: true,
        executedAt: true,
      },
    });

    // Process daily data
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(date.getDate() + 1);

      const dayTrades = dailyTrades.filter(
        (trade) => trade.executedAt && trade.executedAt >= dayStart && trade.executedAt < dayEnd
      );

      const volume = dayTrades.reduce((sum, trade) => sum + Number(trade.totalAmount), 0);

      dailyData.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        volume: Math.round(volume),
      });
    }

    // Process monthly data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(today.getMonth() - i);
      date.setDate(1); // First day of month
      
      const monthStart = new Date(date);
      const monthEnd = new Date(date);
      monthEnd.setMonth(date.getMonth() + 1);

      const monthTrades = monthlyTrades.filter(
        (trade) => trade.executedAt && trade.executedAt >= monthStart && trade.executedAt < monthEnd
      );

      const volume = monthTrades.reduce((sum, trade) => sum + Number(trade.totalAmount), 0);

      monthlyData.push({
        date: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        volume: Math.round(volume),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        daily: dailyData,
        monthly: monthlyData,
      },
    });
  } catch (error) {
    console.error("Error fetching trading volume:", error);
    return NextResponse.json(
      { error: "Failed to fetch trading volume data" },
      { status: 500 }
    );
  }
}