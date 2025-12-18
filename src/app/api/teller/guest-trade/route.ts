import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { Decimal } from "@prisma/client/runtime/library";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "Only tellers can perform guest trades" }, { status: 403 });
    }

    const body = await request.json();
    const { clientName, clientPhone, clientEmail, companySymbol, quantity, paymentMethod = "CASH" } = body;

    if (!clientName || !clientPhone || !companySymbol || !quantity) {
      return NextResponse.json({ error: "Client name, phone, company symbol, and quantity are required" }, { status: 400 });
    }

    if (quantity <= 0 || quantity % 100 !== 0) {
      return NextResponse.json({ error: "Quantity must be a positive multiple of 100" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findFirst({
        where: { symbol: companySymbol },
        select: { id: true, symbol: true, name: true, sharePrice: true, closingPrice: true, availableShares: true },
      });

      if (!company) throw new Error(`Company with symbol '${companySymbol}' not found`);

      const price = company.closingPrice || company.sharePrice;
      if (!price || Number(price) <= 0) throw new Error("Invalid share price");

      const availableShares = company.availableShares ? Number(company.availableShares) : 0;
      if (availableShares < quantity) throw new Error(`Insufficient shares. Only ${availableShares} available`);

      const priceDecimal = new Decimal(price.toString());
      const totalAmount = priceDecimal.mul(quantity);

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          id: uuidv4(),
          clientName,
          phone: clientPhone,
          email: clientEmail || `guest_${Date.now()}@broker.rw`,
          address: "Walk-in Client",
          csdNumber: null,
          bestMarketPrice: true,
          priceLimit: false,
          termsAccepted: true,
          PurchaseOrderItem: {
            create: {
              id: uuidv4(),
              security: company.name,
              quantity,
              price: priceDecimal,
            },
          },
        },
      });

      await tx.company.update({
        where: { id: company.id },
        data: {
          availableShares: { decrement: BigInt(quantity) },
          closingPrice: priceDecimal,
          previousClosingPrice: company.closingPrice || priceDecimal,
          tradedVolume: { increment: new Decimal(quantity.toString()) },
          tradedValue: { increment: totalAmount },
          snapshotDate: new Date(),
        },
      });

      return {
        purchaseOrder,
        company: { id: company.id, symbol: company.symbol, name: company.name },
        transaction: { quantity, pricePerShare: priceDecimal.toNumber(), totalAmount: totalAmount.toNumber(), paymentMethod },
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed purchase of ${quantity} shares of ${result.company.symbol} for ${clientName}`,
      data: result,
    });

  } catch (error) {
    console.error("Guest trade error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to execute guest trade" }, { status: 400 });
  }
}
