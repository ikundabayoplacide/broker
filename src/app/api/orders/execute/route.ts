import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { randomUUID } from "crypto";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request as any);
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { orderId, orderType, buyerId, executedPrice } = await request.json();

    if (!orderId || !orderType || !buyerId || !executedPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const actualOrderId = orderId.split('-').slice(1, -1).join('-');

    if (orderType === 'SELL') {
      await prisma.$transaction(async (tx) => {
        // Get sale order with items
        const saleOrder = await tx.saleOrder.findUnique({
          where: { id: actualOrderId },
          include: { SaleOrderItem: true }
        });

        if (!saleOrder) {
          throw new Error("Sale order not found");
        }

        // Get buyer with wallet
        const buyer = await tx.user.findUnique({
          where: { id: buyerId },
          include: { Wallet: true }
        });

        if (!buyer?.Wallet) {
          throw new Error("Buyer not found or has no wallet");
        }

        const price = new Decimal(executedPrice);
        const item = saleOrder.SaleOrderItem[0]; // Process first item only for simplicity
        const itemTotal = price.mul(item.quantity);
        const fees = itemTotal.mul(0.0171);
        const netAmount = itemTotal.sub(fees);
        const totalWithFees = itemTotal.add(fees);

        // Validate buyer balance
        if (buyer.Wallet.balance.lt(totalWithFees)) {
          throw new Error(`Insufficient balance. Required: ${totalWithFees}, Available: ${buyer.Wallet.balance}`);
        }

        // Get company
        const company = await tx.company.findFirst({
          where: { name: item.security }
        });

        if (!company) {
          throw new Error(`Company not found: ${item.security}`);
        }

        // Create trade record
        await tx.trade.create({
          data: {
            id: randomUUID(),
            userId: buyerId,
            companyId: company.id,
            type: "BUY",
            status: "EXECUTED",
            priceType: "MARKET",
            quantity: item.quantity,
            executedPrice: price,
            executedQuantity: item.quantity,
            totalAmount: itemTotal,
            fees: fees,
            executedAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Update buyer portfolio
        const buyerPortfolio = await tx.portfolio.findFirst({
          where: { userId: buyerId, companyId: company.id }
        });

        if (buyerPortfolio) {
          const newQuantity = buyerPortfolio.quantity + item.quantity;
          const newTotalInvested = buyerPortfolio.totalInvested.add(itemTotal);
          const newAveragePrice = newTotalInvested.div(newQuantity);

          await tx.portfolio.update({
            where: { id: buyerPortfolio.id },
            data: {
              quantity: newQuantity,
              totalInvested: newTotalInvested,
              averageBuyPrice: newAveragePrice
            }
          });
        } else {
          await tx.portfolio.create({
            data: {
              id: randomUUID(),
              userId: buyerId,
              companyId: company.id,
              quantity: item.quantity,
              averageBuyPrice: price,
              totalInvested: itemTotal,
              updatedAt: new Date()
            }
          });
        }

        // Update wallets
        await tx.wallet.update({
          where: { userId: buyerId },
          data: { balance: { decrement: totalWithFees } }
        });

        await tx.wallet.update({
          where: { userId: saleOrder.userId },
          data: { balance: { increment: netAmount } }
        });

        // Update company stats
        await tx.company.update({
          where: { id: company.id },
          data: {
            tradedVolume: { increment: item.quantity },
            tradedValue: { increment: itemTotal }
          }
        });

        // Update sale order status
        await tx.saleOrder.update({
          where: { id: actualOrderId },
          data: { status: "EXECUTED", updatedAt: new Date() }
        });
      }, {
        timeout: 30000 // 30 second timeout
      });

      // Create notifications outside transaction
      try {
        const saleOrder = await prisma.saleOrder.findUnique({
          where: { id: actualOrderId },
          include: { SaleOrderItem: true }
        });

        if (saleOrder) {
          const item = saleOrder.SaleOrderItem[0];
          const price = new Decimal(executedPrice);
          const itemTotal = price.mul(item.quantity);
          const fees = itemTotal.mul(0.0171);
          const netAmount = itemTotal.sub(fees);

          await Promise.all([
            prisma.notification.create({
              data: {
                id: randomUUID(),
                userId: saleOrder.userId,
                title: "Shares Sold",
                message: `${item.quantity} shares of ${item.security} sold at Rwf ${price} per share. Net amount: Rwf ${netAmount}`,
                type: "TRADE",
                updatedAt: new Date()
              }
            }),
            prisma.notification.create({
              data: {
                id: randomUUID(),
                userId: buyerId,
                title: "Shares Purchased",
                message: `${item.quantity} shares of ${item.security} purchased at Rwf ${price} per share. Total cost: Rwf ${itemTotal.add(fees)}`,
                type: "TRADE",
                updatedAt: new Date()
              }
            })
          ]);
        }
      } catch (notificationError) {
        console.error("Failed to create notifications:", notificationError);
      }

      return NextResponse.json({ success: true, message: "Sale order executed successfully" });
    }

    return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
  } catch (error: any) {
    console.error("Execute order error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute order" }, { status: 500 });
  }
}