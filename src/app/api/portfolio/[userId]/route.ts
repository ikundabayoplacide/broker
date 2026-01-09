import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterId = authResult.userId || authResult.id;
    const { userId } = params;

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

      targetUserId = userId;
    }

    // Get portfolio with simplified data for sale order form
    const portfolio = await prisma.portfolio.findMany({
      where: { userId: targetUserId },
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

    // Transform data for sale order form - simplified format
    const portfolioData = portfolio.map(item => ({
      id: item.id,
      security: item.Company.name,
      symbol: item.Company.symbol,
      quantity: item.quantity,
      currentPrice: Number(item.Company.closingPrice || item.Company.sharePrice || 0)
    }));

    return NextResponse.json({
      success: true,
      data: portfolioData
    });

  } catch (error) {
    console.error("Error fetching user portfolio:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}