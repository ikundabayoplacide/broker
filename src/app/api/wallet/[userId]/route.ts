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
      // Check if requester has permission to view other user's wallet
      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        select: { role: true, branchId: true }
      });

      if (!requester) {
        return NextResponse.json({ error: "Requester not found" }, { status: 404 });
      }

      // Only tellers and managers can view client wallets
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

    // Get user wallet with complete information
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        Wallet: {
          select: {
            balance: true,
            lockedBalance: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const balance = Number(user.Wallet?.balance || 0);
    const lockedBalance = Number(user.Wallet?.lockedBalance || 0);

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        userName: user.fullName,
        email: user.email,
        balance: balance,
        lockedBalance: lockedBalance,
        availableBalance: balance - lockedBalance,
        totalBalance: balance + lockedBalance
      }
    });

  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet balance" },
      { status: 500 }
    );
  }
}