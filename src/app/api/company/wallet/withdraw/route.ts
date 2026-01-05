import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthenticatedCompany } from "@/lib/apiAuth";
import { paypackClient, PaypackClient, PaypackError, PaypackTransactionDetails } from "@/lib/paypack";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(req);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = auth.companyId; // Store to ensure TypeScript knows it's not undefined
    const { amount, paymentMethodId } = await req.json();
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount < 5000) {
      return NextResponse.json({ error: "Invalid amount. Minimum withdrawal is 5,000 RWF" }, { status: 400 });
    }

    const paymentMethod = await prisma.companyPaymentMethod.findFirst({
      where: { id: paymentMethodId, companyId, isActive: true },
    });

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    const wallet = await prisma.companyWallet.findUnique({
      where: { companyId },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const availableBalance = wallet.balance.minus(wallet.lockedBalance);
    if (availableBalance.lessThan(new Prisma.Decimal(numericAmount))) {
      return NextResponse.json({ error: `Insufficient balance. Available: ${availableBalance.toString()} RWF` }, { status: 400 });
    }

    const reference = `CWDR${Date.now()}${Math.floor(Math.random() * 10000)}`;
    let paypackResponse: PaypackTransactionDetails | null = null;
    let externalStatus: string | undefined;
    let externalReference: string | undefined;

    if (paymentMethod.type === "MOBILE_MONEY") {
      try {
        const response = await paypackClient.cashOut({
          amount: numericAmount,
          phone: paymentMethod.accountNumber,
          reference,
          description: `Company wallet withdrawal for ${companyId}`,
        });

        paypackResponse = response;
        externalStatus = typeof response.status === "string" ? response.status : undefined;
        externalReference = response.ref ?? reference;

        if (PaypackClient.isFailed(externalStatus)) {
          await prisma.companyTransaction.create({
            data: {
              id: crypto.randomUUID(),
              companyId,
              type: "WITHDRAW",
              amount: new Prisma.Decimal(numericAmount),
              status: "FAILED",
              paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
              reference,
              description: response.processor_message || "Withdrawal declined",
              metadata: { paymentMethodId, accountNumber: paymentMethod.accountNumber, paypack: JSON.parse(JSON.stringify(response)) },
              updatedAt: new Date(),
            },
          });
          return NextResponse.json({ error: response.processor_message || "Withdrawal declined" }, { status: 400 });
        }
      } catch (error) {
        const message = error instanceof PaypackError ? error.message : "Paypack withdrawal failed";
        await prisma.companyTransaction.create({
          data: {
            id: crypto.randomUUID(),
            companyId,
            type: "WITHDRAW",
            amount: new Prisma.Decimal(numericAmount),
            status: "FAILED",
            paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
            reference,
            description: message,
            metadata: { paymentMethodId, accountNumber: paymentMethod.accountNumber },
            updatedAt: new Date(),
          },
        });
        return NextResponse.json({ error: message }, { status: 400 });
      }
    } else {
      externalStatus = "COMPLETED";
      externalReference = reference;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.companyWallet.update({
        where: { companyId },
        data: { balance: { decrement: new Prisma.Decimal(numericAmount) } },
      });

      const transaction = await tx.companyTransaction.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          type: "WITHDRAW",
          amount: new Prisma.Decimal(numericAmount),
          status: "COMPLETED",
          paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
          reference,
          description: `Withdrawal to ${paymentMethod.provider || paymentMethod.type}`,
          metadata: {
            paymentMethodId,
            accountNumber: paymentMethod.accountNumber,
            externalStatus,
            externalReference: externalReference || reference,
            paypack: paypackResponse ? JSON.parse(JSON.stringify(paypackResponse)) : null,
          },
          updatedAt: new Date(),
        },
      });

      // Create notification for successful withdrawal
      await tx.companyNotification.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          title: "Withdrawal Completed",
          message: `Withdrawal of Rwf ${numericAmount.toLocaleString()} has been completed successfully.`,
          type: "WITHDRAWAL_SUCCESS",
          metadata: { transactionId: transaction.id, amount: numericAmount, reference },
          updatedAt: new Date(),
        },
      });

      return { wallet: updatedWallet, transaction };
    });

    return NextResponse.json({
      message: "Withdrawal successful",
      transaction: result.transaction,
      newBalance: result.wallet.balance.toString(),
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return NextResponse.json({ error: "Failed to process withdrawal" }, { status: 500 });
  }
}
