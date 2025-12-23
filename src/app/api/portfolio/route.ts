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

      // For tellers, ensure same branch
      if (requester.role === "TELLER" && targetUser.branchId !== requester.branchId) {
        return NextResponse.json({ error: "Access denied - different branch" }, { status: 403 });
      }

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
        company: {
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

    // Transform the data
    const portfolioData = portfolio.map(item => ({
      companyId: item.companyId,
      quantity: item.quantity,
      averageBuyPrice: Number(item.averageBuyPrice),
      totalInvested: Number(item.totalInvested),
      currentValue: item.quantity * Number(item.company.closingPrice || item.company.sharePrice || 0),
      company: {
        id: item.company.id,
        symbol: item.company.symbol,
        name: item.company.name,
        currentPrice: Number(item.company.closingPrice || item.company.sharePrice || 0)
      }
    }));

    return NextResponse.json({
      success: true,
      portfolio: portfolioData
    });

  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}