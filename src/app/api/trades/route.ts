import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schemas
const tradeSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
  type: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().positive("Quantity must be positive"),
  priceType: z.enum(["MARKET", "LIMIT"]).default("MARKET"),
  requestedPrice: z.number().positive().optional(),
});

const TRADING_FEE_PERCENT = 0.5; // 0.5% trading fee

// POST /api/trades - Execute a buy or sell trade
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = tradeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { userId, companyId, type, quantity, priceType, requestedPrice } = validation.data;

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.sharePrice) {
      return NextResponse.json({ error: "Company not found or no share price available" }, { status: 404 });
    }

    // Determine execution price
    const executionPrice = priceType === "MARKET" ? company.sharePrice : (requestedPrice || company.sharePrice);
    const totalAmount = Number(executionPrice) * quantity;
    const fees = totalAmount * (TRADING_FEE_PERCENT / 100);
    const finalAmount = type === "BUY" ? totalAmount + fees : totalAmount - fees;

    // Execute trade in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // Get wallet
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = await tx.wallet.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            balance: 0,
            lockedBalance: 0,
            updatedAt: new Date(),
          },
        });
      }

      // For BUY trades, check if user has enough balance
      if (type === "BUY") {
        const availableBalance = Number(wallet.balance) - Number(wallet.lockedBalance);
        if (availableBalance < finalAmount) {
          throw new Error(`Insufficient balance. Required: ${finalAmount}, Available: ${availableBalance}`);
        }

        // Deduct from wallet
        await tx.wallet.update({
          where: { userId },
          data: {
            balance: Number(wallet.balance) - finalAmount,
          },
        });
      }

      // For SELL trades, check if user has enough shares
      if (type === "SELL") {
        const portfolio = await tx.portfolio.findUnique({
          where: {
            userId_companyId: {
              userId,
              companyId,
            },
          },
        });

        if (!portfolio || portfolio.quantity < quantity) {
          throw new Error(`Insufficient shares. Required: ${quantity}, Available: ${portfolio?.quantity || 0}`);
        }
      }

      // Create wallet transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: type === "BUY" ? "BUY_SHARES" : "SELL_SHARES",
          amount: finalAmount,
          status: "COMPLETED",
          description: `${type} ${quantity} shares of ${company.name} at ${executionPrice}`,
          metadata: {
            companyId,
            companyName: company.name,
            quantity,
            price: Number(executionPrice),
            fees,
          },
        },
      });

      // Create trade record
      const trade = await tx.trade.create({
        data: {
          userId,
          companyId,
          type,
          status: "EXECUTED",
          priceType,
          quantity,
          requestedPrice: requestedPrice ? Number(requestedPrice) : null,
          executedPrice: Number(executionPrice),
          executedQuantity: quantity,
          totalAmount: finalAmount,
          fees,
          transactionId: transaction.id,
          executedAt: new Date(),
        },
        include: {
          company: {
            select: {
              name: true,
              sector: true,
            },
          },
        },
      });

      // Update portfolio
      if (type === "BUY") {
        // Check if portfolio exists
        const existingPortfolio = await tx.portfolio.findUnique({
          where: {
            userId_companyId: {
              userId,
              companyId,
            },
          },
        });

        if (existingPortfolio) {
          // Update existing portfolio
          const newQuantity = existingPortfolio.quantity + quantity;
          const newTotalInvested = Number(existingPortfolio.totalInvested) + totalAmount;
          const newAverageBuyPrice = newTotalInvested / newQuantity;

          await tx.portfolio.update({
            where: {
              userId_companyId: {
                userId,
                companyId,
              },
            },
            data: {
              quantity: newQuantity,
              totalInvested: newTotalInvested,
              averageBuyPrice: newAverageBuyPrice,
            },
          });
        } else {
          // Create new portfolio entry
          await tx.portfolio.create({
            data: {
              userId,
              companyId,
              quantity,
              totalInvested: totalAmount,
              averageBuyPrice: Number(executionPrice),
            },
          });
        }
      } else {
        // SELL: Reduce portfolio quantity
        const portfolio = await tx.portfolio.findUnique({
          where: {
            userId_companyId: {
              userId,
              companyId,
            },
          },
        });

        if (portfolio) {
          const newQuantity = portfolio.quantity - quantity;
          
          if (newQuantity === 0) {
            // Remove portfolio entry if no shares left
            await tx.portfolio.delete({
              where: {
                userId_companyId: {
                  userId,
                  companyId,
                },
              },
            });
          } else {
            // Update quantity and total invested proportionally
            const ratio = newQuantity / portfolio.quantity;
            await tx.portfolio.update({
              where: {
                userId_companyId: {
                  userId,
                  companyId,
                },
              },
              data: {
                quantity: newQuantity,
                totalInvested: Number(portfolio.totalInvested) * ratio,
              },
            });
          }
        }

        // Add proceeds to wallet
        await tx.wallet.update({
          where: { userId },
          data: {
            balance: Number(wallet.balance) + finalAmount,
          },
        });
      }

      return { trade, transaction };
    });

    return NextResponse.json({
      success: true,
      message: `${type} order executed successfully`,
      trade: result.trade,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("Trade execution error:", error);
    const message = error instanceof Error ? error.message : "Failed to execute trade";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/trades - Get trade history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // Optional filter: BUY or SELL
    const status = searchParams.get("status"); // Optional filter
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 401 });
    }

    // Build filter
    const where: {
      userId: string;
      type?: "BUY" | "SELL";
      status?: "PENDING" | "EXECUTED" | "PARTIALLY_EXECUTED" | "CANCELLED" | "REJECTED";
    } = { userId };

    if (type && ["BUY", "SELL"].includes(type)) {
      where.type = type as "BUY" | "SELL";
    }

    if (status && ["PENDING", "EXECUTED", "PARTIALLY_EXECUTED", "CANCELLED", "REJECTED"].includes(status)) {
      where.status = status as "PENDING" | "EXECUTED" | "PARTIALLY_EXECUTED" | "CANCELLED" | "REJECTED";
    }

    // Get trades with pagination
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          company: {
            select: {
              name: true,
              sector: true,
              sharePrice: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.trade.count({ where }),
    ]);

    return NextResponse.json({
      trades,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Trades GET error:", error);
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
}
