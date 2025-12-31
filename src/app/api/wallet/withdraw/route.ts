import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import {
  paypackClient,
  PaypackClient,
  PaypackError,
  PaypackTransactionDetails,
} from "@/lib/paypack";

// POST /api/wallet/withdraw - Withdraw money from wallet
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = auth.userId; // Extract userId for type safety

    const body = await req.json();
    const { amount, paymentMethodId } = body;
    const numericAmount = Number(amount);

    // Validate amount
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount < 100) {
      return NextResponse.json(
        { error: "Invalid amount. Minimum withdrawal is 100 RWF" },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

    // Get payment method
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId: userId, isActive: true },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found or inactive" },
        { status: 404 }
      );
    }

    // Check wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: userId },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    const availableBalance = wallet.balance.minus(wallet.lockedBalance);
    console.log("Withdrawal check:", {
      requestedAmount: numericAmount,
      walletBalance: wallet.balance.toString(),
      lockedBalance: wallet.lockedBalance.toString(),
      availableBalance: availableBalance.toString(),
      hasEnough: !availableBalance.lessThan(new Prisma.Decimal(numericAmount)),
    });
    
    if (availableBalance.lessThan(new Prisma.Decimal(numericAmount))) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${availableBalance.toString()} RWF, Requested: ${numericAmount} RWF` },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = `WDR${Date.now()}${Math.floor(Math.random() * 10000)}`;

    // Process withdrawal via Paypack for mobile money
    let paypackResponse: PaypackTransactionDetails | null = null;
    let externalStatus: string | undefined;
    let externalReference: string | undefined;

    if (paymentMethod.type === "MOBILE_MONEY") {
      // Call Paypack cash-out API for mobile money withdrawals
      try {
        const response = await paypackClient.cashOut({
          amount: numericAmount,
          phone: paymentMethod.accountNumber,
          reference,
          description: `Wallet withdrawal for ${userId}`,
        });

        paypackResponse = response;
        externalStatus = typeof response.status === "string" ? response.status : undefined;
        externalReference = response.ref ?? reference;

        if (PaypackClient.isFailed(externalStatus)) {
          await prisma.transaction.create({
            data: {
              id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: userId,
              type: "WITHDRAW",
              amount: new Prisma.Decimal(numericAmount),
              status: "FAILED",
              paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
              reference,
              description: response.processor_message || "Withdrawal declined by Paypack",
              updatedAt: new Date(),
              metadata: {
                paymentMethodId,
                accountNumber: paymentMethod.accountNumber,
                paypack: JSON.parse(JSON.stringify(response)),
              },
            },
          });

          return NextResponse.json(
            { error: response.processor_message || "Withdrawal declined" },
            { status: 400 }
          );
        }
      } catch (error) {
        const message = error instanceof PaypackError ? error.message : "Paypack withdrawal failed";

        await prisma.transaction.create({
          data: {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            type: "WITHDRAW",
            amount: new Prisma.Decimal(numericAmount),
            status: "FAILED",
            paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
            reference,
            description: message,
            updatedAt: new Date(),
            metadata: {
              paymentMethodId,
              accountNumber: paymentMethod.accountNumber,
            },
          },
        });

        return NextResponse.json({ error: message }, { status: 400 });
      }
    } else {
      externalStatus = "COMPLETED";
      externalReference = reference;
    }

    // Start a transaction to update wallet and create transaction record
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { userId: userId },
        data: {
          balance: {
            decrement: new Prisma.Decimal(numericAmount),
          },
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: userId,
          type: "WITHDRAW",
          amount: new Prisma.Decimal(numericAmount),
          status: "COMPLETED",
          paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
          reference,
          description: `Withdrawal to ${paymentMethod.provider || paymentMethod.type}`,
          updatedAt: new Date(),
          metadata: {
            paymentMethodId,
            accountNumber: paymentMethod.accountNumber,
            externalStatus,
            externalReference: externalReference || reference,
            paypack: paypackResponse ? JSON.parse(JSON.stringify(paypackResponse)) : null,
          },
        },
      });

      return { wallet: updatedWallet, transaction };
    });

    return NextResponse.json(
      {
        message: "Withdrawal successful",
        transaction: result.transaction,
        newBalance: result.wallet.balance.toString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return NextResponse.json(
      { error: "Failed to process withdrawal" },
      { status: 500 }
    );
  }
}
