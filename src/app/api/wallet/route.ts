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

      // For tellers, ensure same branch
      if (requester.role === "TELLER" && targetUser.branchId !== requester.branchId) {
        return NextResponse.json({ error: "Access denied - different branch" }, { status: 403 });
      }

      targetUserId = userId;
    }

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId: targetUserId }
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await prisma.wallet.create({
        data: {
          userId: targetUserId,
          balance: 0,
          lockedBalance: 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      wallet: {
        balance: Number(wallet.balance),
        lockedBalance: Number(wallet.lockedBalance)
      }
    });

  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}