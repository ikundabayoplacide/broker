import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 401 });
    }

    const portfolios = await prisma.companyPortfolio.findMany({
      where: { companyId: userId },
      include: {
        targetCompany: {
          select: {
            id: true,
            name: true,
            sector: true,
            sharePrice: true,
            closingPrice: true,
            previousClosingPrice: true,
            priceChange: true,
          },
        },
      },
      orderBy: { totalInvested: "desc" },
    });

    const portfolioWithMetrics = portfolios.map((portfolio) => {
      const currentPrice = Number(portfolio.targetCompany.closingPrice || portfolio.targetCompany.sharePrice || 0);
      const currentValue = currentPrice * portfolio.quantity;
      const totalInvested = Number(portfolio.totalInvested);
      const profitLoss = currentValue - totalInvested;
      const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
      const priceChange = portfolio.targetCompany.priceChange || "0.00";

      return {
        id: portfolio.id,
        companyId: portfolio.targetCompany.id,
        companyName: portfolio.targetCompany.name,
        sector: portfolio.targetCompany.sector,
        quantity: portfolio.quantity,
        averageBuyPrice: Number(portfolio.averageBuyPrice),
        currentPrice,
        totalInvested,
        currentValue,
        profitLoss,
        profitLossPercentage,
        priceChange,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt,
      };
    });

    const totalInvested = portfolioWithMetrics.reduce((sum, p) => sum + p.totalInvested, 0);
    const totalCurrentValue = portfolioWithMetrics.reduce((sum, p) => sum + p.currentValue, 0);
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    const sectorAllocation = portfolioWithMetrics.reduce((acc, p) => {
      const sector = p.sector || "Unknown";
      if (!acc[sector]) {
        acc[sector] = { sector, value: 0, percentage: 0 };
      }
      acc[sector].value += p.currentValue;
      return acc;
    }, {} as Record<string, { sector: string; value: number; percentage: number }>);

    Object.values(sectorAllocation).forEach((allocation) => {
      allocation.percentage = totalCurrentValue > 0 ? (allocation.value / totalCurrentValue) * 100 : 0;
    });

    return NextResponse.json({
      portfolio: portfolioWithMetrics,
      summary: {
        totalInvested,
        totalCurrentValue,
        totalProfitLoss,
        totalProfitLossPercentage,
        totalHoldings: portfolios.length,
      },
      sectorAllocation: Object.values(sectorAllocation),
    });
  } catch (error) {
    console.error("Portfolio GET error:", error);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}
