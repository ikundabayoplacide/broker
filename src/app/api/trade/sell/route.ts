import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { Decimal } from "@prisma/client/runtime/library";
import { Transaction_type, Transaction_status } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authResult.userId || authResult.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }
    
    const body = await request.json();
    const { companySymbol, quantity, priceType = "MARKET" } = body;

    if (!companySymbol || !quantity) {
      return NextResponse.json(
        { error: "Company symbol and quantity are required" },
        { status: 400 }
      );
    }

    if (quantity <= 0 || quantity % 100 !== 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive multiple of 100" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find company
      const company = await tx.company.findFirst({
        where: { symbol: companySymbol },
        select: {
          id: true,
          symbol: true,
          name: true,
          sharePrice: true,
          closingPrice: true,
          availableShares: true,
          totalShares: true,
        },
      });

      if (!company) {
        throw new Error(`Company with symbol '${companySymbol}' not found`);
      }

      // 2. Check user's portfolio
      const portfolio = await tx.portfolio.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId: company.id,
          },
        },
      });

      if (!portfolio || portfolio.quantity < quantity) {
        throw new Error(`Insufficient shares. You own ${portfolio?.quantity || 0} shares`);
      }

      // 3. Determine price
      const price = company.closingPrice || company.sharePrice;
      if (!price || Number(price) <= 0) {
        throw new Error("Invalid share price");
      }

      const priceDecimal = new Decimal(price.toString());
      const totalAmount = priceDecimal.mul(quantity);

      // 4. Create trade record
      const trade = await tx.trade.create({
        data: {
          id: randomUUID(),
          userId,
          companyId: company.id,
          type: "SELL",
          status: "EXECUTED",
          priceType,
          quantity,
          requestedPrice: priceDecimal,
          executedPrice: priceDecimal,
          executedQuantity: quantity,
          totalAmount,
          fees: new Decimal(0),
          executedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 5. Update wallet balance
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: totalAmount,
          },
        },
      });

      // 6. (DEFERRED) Build transaction payload to create after the DB transaction commits
      const transactionPayload = {
        userId,
        type: "SELL_SHARES" as Transaction_type,
        amount: totalAmount,
        status: "COMPLETED" as Transaction_status,
        reference: `TRADE-${trade.id}`,
        description: `Sale of ${quantity} shares of ${company.symbol} at Rwf ${priceDecimal.toFixed(2)} per share`,
        metadata: {
          tradeId: trade.id,
          companyId: company.id,
          companySymbol: company.symbol,
          quantity,
          pricePerShare: priceDecimal.toNumber(),
        },
      };

      // 7. Update portfolio
      const newQuantity = portfolio.quantity - quantity;
      if (newQuantity === 0) {
        await tx.portfolio.delete({
          where: {
            userId_companyId: {
              userId,
              companyId: company.id,
            },
          },
        });
      } else {
        const previousInvested = new Decimal(portfolio.totalInvested.toString());
        const soldProportion = quantity / portfolio.quantity;
        const newTotalInvested = previousInvested.mul(1 - soldProportion);

        await tx.portfolio.update({
          where: {
            userId_companyId: {
              userId,
              companyId: company.id,
            },
          },
          data: {
            quantity: newQuantity,
            totalInvested: newTotalInvested,
          },
        });
      }

      // 8. Update company's available shares and trading data
      const currentAvailableShares = company.availableShares ? Number(company.availableShares) : 0;
      const newAvailableShares = BigInt(currentAvailableShares + quantity);
      
      const currentCompany = await tx.company.findUnique({
        where: { id: company.id },
        select: { closingPrice: true, previousClosingPrice: true }
      });
      
      const newClosingPrice = priceDecimal;
      const oldClosingPrice = currentCompany?.closingPrice || priceDecimal;
      
      const priceChangeInCents = Number(newClosingPrice) - Number(oldClosingPrice);
      
      await tx.company.update({
        where: { id: company.id },
        data: {
          availableShares: newAvailableShares,
          closingPrice: newClosingPrice,
          previousClosingPrice: oldClosingPrice,
          priceChange: priceChangeInCents.toFixed(2),
          tradedVolume: {
            increment: new Decimal(quantity.toString()),
          },
          tradedValue: {
            increment: totalAmount,
          },
          snapshotDate: new Date(),
        },
      });

      const updatedWallet = await tx.wallet.findUnique({
        where: { userId },
      });

      return {
        trade,
        company: {
          id: company.id,
          symbol: company.symbol,
          name: company.name,
        },
        transactionPayload,
        transaction: {
          quantity,
          pricePerShare: priceDecimal.toNumber(),
          totalAmount: totalAmount.toNumber(),
        },
        newBalance: updatedWallet?.balance.toString() || "0",
      };
    }, {
      timeout: 15000 // 15 second interactive transaction timeout
    });

    // After the DB transaction has committed, create the Transaction record
    let createdTransaction = null;
    try {
      const txData = result.transactionPayload;
      createdTransaction = await prisma.transaction.create({
        data: {
          id: randomUUID(),
          userId: txData.userId,
          type: txData.type,
          amount: txData.amount,
          status: txData.status,
          reference: txData.reference,
          description: txData.description,
          metadata: txData.metadata,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      console.error('Transaction record creation failed after commit:', err);
      // Not fatal for the trade — continue and return success for the trade itself
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sold ${quantity} shares of ${result.company.symbol}`,
      data: {
        ...result,
        transactionRecord: createdTransaction,
      },
    });

  } catch (error) {
    console.error("Sell trade error:", error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to execute sell trade" }, { status: 500 });
  }
}
