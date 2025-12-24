// amazonq-ignore-file typescript-code-quality-error-handling
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { Decimal } from "@prisma/client/runtime/library";
import { tradeSchema, validateTradePermissions } from "@/lib/validations/tradeValidation";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const executorId = authResult.userId || authResult.id;
    if (!executorId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Get executor details
    const executor = await prisma.user.findUnique({
      where: { id: executorId },
      select: { role: true, branchId: true, fullName: true, email: true }
    });

    if (!executor) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    
    // Validate input using schema
    const validationResult = tradeSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { 
      companySymbol, 
      quantity, 
      tradeType, 
      priceType, 
      limitPrice,
      clientId 
    } = validationResult.data;

    // Validate permissions
    try {
      validateTradePermissions(executor.role, clientId, executorId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Permission denied" },
        { status: 403 }
      );
    }

    // Determine the actual client for the trade
    let actualClientId = executorId; // Default to executor trading for themselves
    
    // Role-based client selection logic
    if ((executor.role === "TELLER" || executor.role === "MANAGER") && clientId) {
      // Only when clientId is provided, trade for the client
      const client = await prisma.user.findUnique({
        where: { id: clientId },
        select: { id: true, role: true, branchId: true, fullName: true }
      });

      if (!client || client.role !== "CLIENT") {
        return NextResponse.json(
          { error: "Invalid client selected" },
          { status: 400 }
        );
      }

      // For tellers, ensure client is from the same branch
      if (executor.role === "TELLER" && client.branchId !== executor.branchId) {
        return NextResponse.json(
          { error: "You can only trade for clients in your branch" },
          { status: 403 }
        );
      }

      actualClientId = clientId;
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find the company
      const company = await tx.company.findFirst({
        where: { symbol: companySymbol },
        select: {
          id: true,
          symbol: true,
          name: true,
          sharePrice: true,
          closingPrice: true,
          availableShares: true,
        },
      });

      if (!company) {
        throw new Error(`Company with symbol '${companySymbol}' not found`);
      }

      // Determine price
      let executionPrice: Decimal;
      if (priceType === "LIMIT") {
        if (!limitPrice || limitPrice <= 0) {
          throw new Error("Valid limit price is required for limit orders");
        }
        executionPrice = new Decimal(limitPrice.toString());
      } else {
        const marketPrice = company.closingPrice || company.sharePrice;
        if (!marketPrice || Number(marketPrice) <= 0) {
          throw new Error("Invalid market price for this company");
        }
        executionPrice = new Decimal(marketPrice.toString());
      }

      // Calculate amounts
      const totalAmount = executionPrice.mul(quantity);
      const fees = totalAmount.mul(0.01); // 1% trading fee
      const finalAmount = totalAmount.add(fees);

      // Get client's wallet and portfolio
      const wallet = await tx.wallet.findUnique({
        where: { userId: actualClientId },
      });

      if (!wallet) {
        throw new Error("Client wallet not found");
      }

      let portfolio = null;
      if (tradeType === "SELL") {
        portfolio = await tx.portfolio.findUnique({
          where: {
            userId_companyId: {
              userId: actualClientId,
              companyId: company.id,
            },
          },
        });
      }

      // Validate trade constraints
      if (tradeType === "BUY") {
        // Check wallet balance
        if (new Decimal(wallet.balance.toString()).lessThan(finalAmount)) {
          throw new Error(
            `Insufficient balance. Required: Rwf ${finalAmount.toFixed(2)}, Available: Rwf ${wallet.balance.toString()}`
          );
        }

        // Check available shares
        const availableShares = company.availableShares ? Number(company.availableShares) : 0;
        if (availableShares < quantity) {
          throw new Error(`Insufficient shares available. Only ${availableShares} shares available`);
        }
      } else {
        // SELL - Check portfolio holdings
        if (!portfolio || portfolio.quantity < quantity) {
          const available = portfolio?.quantity || 0;
          throw new Error(`Insufficient shares to sell. Available: ${available}, Requested: ${quantity}`);
        }
      }

      // Create trade record
      const trade = await tx.trade.create({
        data: {
          id: crypto.randomUUID(),
          userId: actualClientId,
          companyId: company.id,
          branchId: executor.branchId,
          type: tradeType,
          status: "EXECUTED",
          priceType,
          quantity,
          requestedPrice: executionPrice,
          executedPrice: executionPrice,
          executedQuantity: quantity,
          totalAmount: finalAmount,
          fees,
          executedAt: new Date(),
          updatedAt: new Date(),
          notes: executor.role !== "CLIENT" ? `Executed by ${executor.role}: ${executor.fullName}` : undefined,
        },
      });

      // Update wallet
      if (tradeType === "BUY") {
        await tx.wallet.update({
          where: { userId: actualClientId },
          data: { balance: { decrement: finalAmount } },
        });
      } else {
        await tx.wallet.update({
          where: { userId: actualClientId },
          data: { balance: { increment: totalAmount.sub(fees) } },
        });
      }

      // Create transaction record
      await tx.transaction.create({
        data: {
          id: crypto.randomUUID(),
          userId: actualClientId,
          type: tradeType === "BUY" ? "BUY_SHARES" : "SELL_SHARES",
          amount: tradeType === "BUY" ? finalAmount.neg() : totalAmount.sub(fees),
          status: "COMPLETED",
          reference: `TRADE-${trade.id}`,
          description: `${tradeType} ${quantity} shares of ${company.symbol} at Rwf ${executionPrice.toFixed(2)} per share`,
          metadata: {
            tradeId: trade.id,
            companyId: company.id,
            companySymbol: company.symbol,
            quantity,
            pricePerShare: executionPrice.toNumber(),
            executedBy: executorId,
            executorRole: executor.role,
          },
          updatedAt: new Date(),
        },
      });

      // Update portfolio
      if (tradeType === "BUY") {
        const existingPortfolio = await tx.portfolio.findUnique({
          where: {
            userId_companyId: {
              userId: actualClientId,
              companyId: company.id,
            },
          },
        });

        if (existingPortfolio) {
          const newQuantity = existingPortfolio.quantity + quantity;
          const previousInvested = new Decimal(existingPortfolio.totalInvested.toString());
          const newTotalInvested = previousInvested.add(totalAmount);
          const newAverageBuyPrice = newTotalInvested.div(newQuantity);

          await tx.portfolio.update({
            where: {
              userId_companyId: {
                userId: actualClientId,
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
          await tx.portfolio.create({
            data: {
              id: crypto.randomUUID(),
              userId: actualClientId,
              companyId: company.id,
              quantity,
              averageBuyPrice: executionPrice,
              totalInvested: totalAmount,
              updatedAt: new Date(),
            },
          });
        }
      } else {
        // SELL - Update portfolio
        if (portfolio) {
          const newQuantity = portfolio.quantity - quantity;
          if (newQuantity === 0) {
            await tx.portfolio.delete({
              where: {
                userId_companyId: {
                  userId: actualClientId,
                  companyId: company.id,
                },
              },
            });
          } else {
            const soldValue = new Decimal(portfolio.averageBuyPrice.toString()).mul(quantity);
            const newTotalInvested = new Decimal(portfolio.totalInvested.toString()).sub(soldValue);
            
            await tx.portfolio.update({
              where: {
                userId_companyId: {
                  userId: actualClientId,
                  companyId: company.id,
                },
              },
              data: {
                quantity: newQuantity,
                totalInvested: newTotalInvested,
              },
            });
          }
        }
      }

      // Update company data
      const availableShares = company.availableShares ? Number(company.availableShares) : 0;
      const newAvailableShares = tradeType === "BUY" 
        ? BigInt(availableShares - quantity)
        : BigInt(availableShares + quantity);

      const currentCompany = await tx.company.findUnique({
        where: { id: company.id },
        select: { closingPrice: true, tradedVolume: true, tradedValue: true }
      });

      const oldClosingPrice = currentCompany?.closingPrice || executionPrice;
      const priceChangeInCents = Number(executionPrice) - Number(oldClosingPrice);

      await tx.company.update({
        where: { id: company.id },
        data: {
          availableShares: newAvailableShares,
          closingPrice: executionPrice,
          previousClosingPrice: oldClosingPrice,
          priceChange: priceChangeInCents.toFixed(2),
          tradedVolume: { increment: new Decimal(quantity.toString()) },
          tradedValue: { increment: totalAmount },
          snapshotDate: new Date(),
        },
      });

      // Get updated wallet
      const updatedWallet = await tx.wallet.findUnique({
        where: { userId: actualClientId },
      });

      // Create notification
      const client = await tx.user.findUnique({
        where: { id: actualClientId },
        select: { fullName: true, email: true }
      });

      await tx.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: actualClientId,
          title: "Trade Executed Successfully",
          message: `${tradeType} order executed: ${quantity} shares of ${company.symbol} at Rwf ${executionPrice.toFixed(2)} per share. ${executor.role !== "CLIENT" ? `Executed by ${executor.fullName} (${executor.role})` : ""}`,
          type: "TRADE",
          metadata: {
            tradeId: trade.id,
            companySymbol: company.symbol,
            companyName: company.name,
            quantity,
            pricePerShare: executionPrice.toNumber(),
            totalAmount: totalAmount.toNumber(),
            type: tradeType,
            executedBy: executorId,
            executorRole: executor.role,
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
          pricePerShare: executionPrice.toNumber(),
          totalAmount: totalAmount.toNumber(),
          fees: fees.toNumber(),
          finalAmount: finalAmount.toNumber(),
        },
        newBalance: updatedWallet?.balance.toString() || "0",
        client: client?.fullName,
        executor: executor.fullName,
        executorRole: executor.role,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully ${tradeType.toLowerCase()}ed ${quantity} shares of ${result.company.symbol}`,
      data: result,
    });

  } catch (error) {
    console.error("Trade error:", error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to execute trade" }, { status: 500 });
  }
}