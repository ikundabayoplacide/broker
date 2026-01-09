import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { SaleOrder_status, PurchaseOrder_status } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request as any);
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { orderId, orderType } = await request.json();

    if (!orderId || !orderType) {
      return NextResponse.json({ error: "Order ID and type required" }, { status: 400 });
    }

    // Extract the actual order ID from the formatted ID (SO-xxx-1 or PO-xxx-1)
    const actualOrderId = orderId.split('-').slice(1, -1).join('-');

    if (orderType === 'SELL') {
      const result = await prisma.saleOrder.update({
        where: { id: actualOrderId },
        data: { status: "PROCESS" as SaleOrder_status, updatedAt: new Date() }
      });
    } else if (orderType === 'BUY') {
      const result = await prisma.purchaseOrder.update({
        where: { id: actualOrderId },
        data: { status: "PROCESS" as PurchaseOrder_status, updatedAt: new Date() }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to approve order" }, { status: 500 });
  }
}