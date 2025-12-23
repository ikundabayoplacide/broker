import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { Decimal } from "@prisma/client/runtime/library";

interface AuthUser {
  userId?: string;
  id?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = authResult.userId || authResult.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { companySymbol, quantity, priceType = "MARKET" } = body;

    // Validate input
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

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the company by symbol
      const company = await tx.company.findFirst({
        where: {
          symbol: companySymbol,
        },
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

      // 2. Determine the price to use
      const price = company.closingPrice || company.sharePrice;
      if (!price || Number(price) <= 0) {
        throw new Error("Invalid share price for this company");
      }

      // 3. Check available shares
      const availableShares = company.availableShares ? Number(company.availableShares) : 0;
      if (availableShares < quantity) {
        throw new Error(`Insufficient shares available. Only ${availableShares} shares available`);
      }

      // 4. Calculate total amount
      const priceDecimal = new Decimal(price.toString());
      const totalAmount = priceDecimal.mul(quantity);

      // 5. Get user's wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new Error("Wallet not found. Please contact support.");
      }

      // 6. Check balance
      if (new Decimal(wallet.balance.toString()).lessThan(totalAmount)) {
        throw new Error(
          `Insufficient balance. Required: Rwf ${totalAmount.toFixed(2)}, Available: Rwf ${wallet.balance.toString()}`
        );
      }

      // 7. Create trade record
      const trade = await tx.trade.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          companyId: company.id,
          type: "BUY",
          status: "EXECUTED",
          priceType,
          quantity,
          requestedPrice: priceDecimal,
          executedPrice: priceDecimal,
          executedQuantity: quantity,
          totalAmount,
          fees: new Decimal(0), // Can add trading fees here
          executedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 8. Update user's wallet balance
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: totalAmount,
          },
        },
      });

      // 9. Create transaction record
      await tx.transaction.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          type: "BUY_SHARES",
          amount: totalAmount.neg(), // Make it negative to show money going out
          status: "COMPLETED",
          reference: `TRADE-${trade.id}`,
          description: `Purchase of ${quantity} shares of ${company.symbol} at Rwf ${priceDecimal.toFixed(2)} per share`,
          metadata: {
            tradeId: trade.id,
            companyId: company.id,
            companySymbol: company.symbol,
            quantity,
            pricePerShare: priceDecimal.toNumber(),
          },
          updatedAt: new Date(),
        },
      });

      // 10. Update or create portfolio entry
      const existingPortfolio = await tx.portfolio.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId: company.id,
          },
        },
      });

      if (existingPortfolio) {
        // Update existing portfolio
        const newQuantity = existingPortfolio.quantity + quantity;
        const previousInvested = new Decimal(existingPortfolio.totalInvested.toString());
        const newTotalInvested = previousInvested.add(totalAmount);
        const newAverageBuyPrice = newTotalInvested.div(newQuantity);

        await tx.portfolio.update({
          where: {
            userId_companyId: {
              userId,
              companyId: company.id,
            },
          },
          data: {
            quantity: newQuantity,
            averageBuyPrice: newAverageBuyPrice,
            totalInvested: newTotalInvested,
          },
        });
      } else {
        // Create new portfolio entry
        await tx.portfolio.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            companyId: company.id,
            quantity,
            averageBuyPrice: priceDecimal,
            totalInvested: totalAmount,
            updatedAt: new Date(),
          },
        });
      }

      // 11. Update company's available shares and trading data
      const newAvailableShares = BigInt(availableShares - quantity);
      
      // Get current company data for calculations
      const currentCompany = await tx.company.findUnique({
        where: { id: company.id },
        select: { closingPrice: true, previousClosingPrice: true, tradedVolume: true, tradedValue: true }
      });
      
      // Update closingPrice to current trade price
      const newClosingPrice = priceDecimal;
      const oldClosingPrice = currentCompany?.closingPrice || priceDecimal;
      
      // Calculate priceChange in cents (difference between new closing and old closing)
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

      // 12. Get updated wallet balance
      const updatedWallet = await tx.wallet.findUnique({
        where: { userId },
      });

      // 13. Create notification
      await tx.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          title: "Trade Executed Successfully",
          message: `You have successfully purchased ${quantity} shares of ${company.symbol} (${company.name}) at Rwf ${priceDecimal.toFixed(2)} per share. Total: Rwf ${totalAmount.toFixed(2)}`,
          type: "TRADE",
          metadata: {
            tradeId: trade.id,
            companySymbol: company.symbol,
            companyName: company.name,
            quantity,
            pricePerShare: priceDecimal.toNumber(),
            totalAmount: totalAmount.toNumber(),
            type: "BUY",
          },
          updatedAt: new Date(),
        },
      });

      return {
        trade,
        company: {
          id: company.id,
          symbol: company.symbol,
          name: company.name,
        },
        transaction: {
          quantity,
          pricePerShare: priceDecimal.toNumber(),
          totalAmount: totalAmount.toNumber(),
        },
        newBalance: updatedWallet?.balance.toString() || "0",
      };
    });

    // Send email notification (async, don't wait)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/send-trade-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          fullName: user.fullName,
          tradeType: 'BUY',
          companySymbol: result.company.symbol,
          companyName: result.company.name,
          quantity,
          pricePerShare: result.transaction.pricePerShare,
          totalAmount: result.transaction.totalAmount,
          newBalance: result.newBalance,
        }),
      }).catch(err => console.error('Email send error:', err));
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${quantity} shares of ${result.company.symbol}`,
      data: result,
    });

  } catch (error) {
    console.error("Trade error:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to execute trade" },
      { status: 500 }
    );
  }
}
