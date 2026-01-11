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

    const { orderId, orderType, tradeId } = await request.json();

    if (!orderId || !orderType) {
      return NextResponse.json({ error: "Order ID and type required" }, { status: 400 });
    }

    // Extract the actual order ID from the formatted ID (SO-xxx-1 or PO-xxx-1)
    // Format: PO-{uuid}-{index} or SO-{uuid}-{index}
    const parts = orderId.split('-');
    if (parts.length >= 3) {
      // Remove the first part (PO/SO) and last part (index), keep the UUID
      const actualOrderId = parts.slice(1, -1).join('-');
      console.log('🔍 ORDER EXECUTE - Parsed order ID:', { original: orderId, parsed: actualOrderId });
      
      if (orderType === 'SELL') {
        const result = await prisma.saleOrder.update({
          where: { id: actualOrderId },
          data: { 
            status: "EXECUTED" as SaleOrder_status, 
            updatedAt: new Date() 
          }
        });
        console.log('✅ ORDER EXECUTE - Sale order updated to EXECUTED:', actualOrderId);
      } else if (orderType === 'BUY') {
        const result = await prisma.purchaseOrder.update({
          where: { id: actualOrderId },
          data: { 
            status: "EXECUTED" as PurchaseOrder_status, 
            updatedAt: new Date() 
          }
        });
        console.log('✅ ORDER EXECUTE - Purchase order updated to EXECUTED:', actualOrderId);
      }
    } else {
      throw new Error(`Invalid order ID format: ${orderId}`);
    }

    return NextResponse.json({ success: true, message: "Order executed successfully" });
  } catch (error) {
    console.error('❌ ORDER EXECUTE - Error:', error);
    return NextResponse.json({ error: "Failed to execute order" }, { status: 500 });
  }
}
