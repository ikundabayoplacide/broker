import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authResult.userId || authResult.id;
    
    const teller = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, branchId: true },
    });

    if (!teller || teller.role !== "TELLER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingOrders, executedToday, totalVolume, activeClients] = await Promise.all([
      prisma.trade.count({ where: { status: "PENDING", branchId: teller.branchId || undefined } }),
      prisma.trade.count({ where: { status: "EXECUTED", executedAt: { gte: today }, branchId: teller.branchId || undefined } }),
      prisma.trade.aggregate({
        where: { status: "EXECUTED", executedAt: { gte: today }, branchId: teller.branchId || undefined },
        _sum: { totalAmount: true },
      }),
      prisma.user.count({ where: { role: "CLIENT", branchId: teller.branchId || undefined } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        pendingOrders,
        executedToday,
        totalVolume: totalVolume._sum.totalAmount?.toString() || "0",
        activeClients,
      },
    });

  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
