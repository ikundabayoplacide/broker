import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterId = authResult.userId || authResult.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const companyId = searchParams.get("companyId");

    // Determine target user ID
    let targetUserId = requesterId;
    
    if (userId && userId !== requesterId) {
      // Check if requester has permission to view other user's portfolio
      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        select: { role: true, branchId: true }
      });

      if (!requester) {
        return NextResponse.json({ error: "Requester not found" }, { status: 404 });
      }

      // Only tellers and managers can view client portfolios
      if (!["TELLER", "MANAGER"].includes(requester.role)) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
      }

      // Verify the target user exists and is a client
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, branchId: true }
      });

      if (!targetUser || targetUser.role !== "CLIENT") {
        return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
      }

      // For tellers, allow access to all clients (removed branch restriction)
      // Managers already have access to all branches
      // if (requester.role === "TELLER" && targetUser.branchId !== requester.branchId) {
      //   return NextResponse.json({ error: "Access denied - different branch" }, { status: 403 });
      // }

      targetUserId = userId;
    }

    // Get portfolio
    const whereClause: any = { userId: targetUserId };
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    const portfolio = await prisma.portfolio.findMany({
      where: whereClause,
      include: {
        Company: {
          select: {
            id: true,
            symbol: true,
            name: true,
            closingPrice: true,
            sharePrice: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Transform the data and calculate summary
    const portfolioData = portfolio.map(item => {
      const currentPrice = Number(item.Company.closingPrice || item.Company.sharePrice || 0);
      const currentValue = item.quantity * currentPrice;
      const totalInvested = Number(item.totalInvested);
      const profitLoss = currentValue - totalInvested;
      const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
      
      return {
        id: item.id,
        companyId: item.companyId,
        companyName: item.Company.name,
        sector: null, // Add sector if available in Company model
        quantity: item.quantity,
        averageBuyPrice: Number(item.averageBuyPrice),
        currentPrice,
        totalInvested,
        currentValue,
        profitLoss,
        profitLossPercentage,
        company: {
          id: item.Company.id,
          symbol: item.Company.symbol,
          name: item.Company.name,
          currentPrice
        }
      };
    });

    // Calculate summary from Portfolio table data
    const summary = {
      totalInvested: portfolioData.reduce((sum, item) => sum + item.totalInvested, 0),
      totalCurrentValue: portfolioData.reduce((sum, item) => sum + item.currentValue, 0),
      totalProfitLoss: portfolioData.reduce((sum, item) => sum + item.profitLoss, 0),
      totalProfitLossPercentage: 0,
      totalHoldings: portfolioData.length
    };
    
    // Calculate overall profit/loss percentage
    if (summary.totalInvested > 0) {
      summary.totalProfitLossPercentage = (summary.totalProfitLoss / summary.totalInvested) * 100;
    }

    return NextResponse.json({
      success: true,
      portfolio: portfolioData,
      summary
    });

  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}