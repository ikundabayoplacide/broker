import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request as any);
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get all pending purchase orders for the user
    const pendingOrders = await prisma.purchaseOrder.findMany({
      where: {
        userId: auth.userId,
        status: "PENDING"
      },
      include: {
        PurchaseOrderItem: true
      }
    });

    // Calculate total reserved amount
    let totalReservedAmount = 0;
    
    for (const order of pendingOrders) {
      for (const item of order.PurchaseOrderItem) {
        totalReservedAmount += Number((item as any).reservedAmount || 0);
      }
    }

    return NextResponse.json({
      totalReservedAmount,
      pendingPurchaseOrdersCount: pendingOrders.length
    });

  } catch (error) {
    console.error("Error fetching reserved amounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch reserved amounts" },
      { status: 500 }
    );
  }
}