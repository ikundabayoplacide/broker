import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authenticatedUserId = authResult.userId || authResult.id;
    if (!authenticatedUserId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const requestedUserId = searchParams.get("userId");
    
    // Get authenticated user's role to check permissions
    const authenticatedUser = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
      select: { role: true, branchId: true }
    });
    
    if (!authenticatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Determine which user's trades to fetch
    let targetUserId = authenticatedUserId;
    
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      // Check if authenticated user has permission to view other user's trades
      if (["MANAGER", "TELLER", "ADMIN", "SUPER_ADMIN"].includes(authenticatedUser.role)) {
        // Verify the requested user exists and is accessible
        const requestedUser = await prisma.user.findUnique({
          where: { id: requestedUserId },
          select: { id: true, branchId: true, role: true }
        });
        
        if (!requestedUser) {
          return NextResponse.json({ error: "Requested user not found" }, { status: 404 });
        }
        
        // Additional permission checks based on role
        if (authenticatedUser.role === "TELLER" || authenticatedUser.role === "MANAGER") {
          // Tellers and Managers can only view users in their branch
          if (requestedUser.branchId !== authenticatedUser.branchId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
          }
        }
        
        targetUserId = requestedUserId;
      } else {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const trades = await prisma.trade.findMany({
      where: { userId: targetUserId },
      include: {
        company: {
          select: {
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ trades });
  } catch (error) {
    console.error("Error fetching trade history:", error);
    return NextResponse.json(
      { error: "Failed to fetch trade history" },
      { status: 500 }
    );
  }
}
