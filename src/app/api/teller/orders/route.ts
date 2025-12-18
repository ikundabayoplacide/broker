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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");

    const whereClause: any = { branchId: teller.branchId || undefined };
    if (status !== "all") {
      whereClause.status = status.toUpperCase();
    }

    const orders = await prisma.trade.findMany({
      where: whereClause,
      include: {
        User: { select: { id: true, fullName: true, email: true, csdNumber: true } },
        Company: { select: { symbol: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: orders.map(order => ({
        id: order.id,
        client: { name: order.User.fullName, id: order.User.csdNumber || order.User.id, email: order.User.email },
        type: order.type,
        company: { symbol: order.Company.symbol, name: order.Company.name },
        quantity: order.quantity,
        price: order.executedPrice?.toString() || order.requestedPrice?.toString() || "0",
        total: order.totalAmount.toString(),
        date: order.createdAt,
        status: order.status.toLowerCase(),
      })),
    });

  } catch (error) {
    console.error("Orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
