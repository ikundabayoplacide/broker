import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthenticatedCompany } from "@/lib/apiAuth";
import { paypackClient, PaypackClient, PaypackError } from "@/lib/paypack";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(req);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, paymentMethodId } = await req.json();
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount < 100) {
      return NextResponse.json({ error: "Invalid amount. Minimum is 100 RWF" }, { status: 400 });
    }

    const paymentMethod = await prisma.companyPaymentMethod.findFirst({
      where: { id: paymentMethodId, companyId: auth.companyId, isActive: true },
    });

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    const reference = `CDEP${Date.now()}${Math.floor(Math.random() * 10000)}`;
    let paypackResponse: Record<string, unknown> | null = null;
    let externalStatus: string | undefined;
    let externalReference: string | undefined;

    const isTestMode = process.env.NODE_ENV === 'development' && process.env.PAYPACK_TEST_MODE === 'true';

    if (paymentMethod.type === "MOBILE_MONEY") {
      const formattedPhone = paymentMethod.accountNumber.trim();

      if (isTestMode) {
        paypackResponse = {
          ref: reference,
          status: "SUCCESS",
          amount: numericAmount,
          number: formattedPhone,
        };
        externalStatus = "SUCCESS";
        externalReference = reference;
      } else {
        try {
          const response = await paypackClient.cashIn({
            amount: numericAmount,
            phone: formattedPhone,
            reference,
            description: `Company wallet deposit for ${auth.companyId}`,
          });

          paypackResponse = response;
          externalStatus = "PENDING";
          externalReference = (response.ref as string | undefined) ?? reference;

          if (PaypackClient.isFailed(externalStatus)) {
            await prisma.companyTransaction.create({
              data: {
                id: crypto.randomUUID(),
                companyId: auth.companyId,
                type: "DEPOSIT",
                amount: new Prisma.Decimal(numericAmount),
                status: "FAILED",
                paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
                reference,
                description: response.processor_message || "Deposit declined",
                metadata: { paymentMethodId, accountNumber: paymentMethod.accountNumber, paypack: JSON.parse(JSON.stringify(response)) },
                updatedAt: new Date(),
              },
            });
            return NextResponse.json({ error: response.processor_message || "Deposit declined" }, { status: 400 });
          }
        } catch (error) {
          let message = error instanceof PaypackError ? error.message : "Paypack deposit failed";
          if (message.includes('unsupported provider')) {
            message = `Phone number ${formattedPhone} is not whitelisted in Paypack. Please add it to your merchant account.`;
          }
          await prisma.companyTransaction.create({
            data: {
              id: crypto.randomUUID(),
              companyId: auth.companyId,
              type: "DEPOSIT",
              amount: new Prisma.Decimal(numericAmount),
              status: "FAILED",
              paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
              reference,
              description: message,
              metadata: { paymentMethodId, accountNumber: paymentMethod.accountNumber, error: error instanceof Error ? error.message : String(error) },
              updatedAt: new Date(),
            },
          });
          return NextResponse.json({ error: message }, { status: 400 });
        }
      }
    }

    const transaction = await prisma.companyTransaction.create({
      data: {
        id: crypto.randomUUID(),
        companyId: auth.companyId,
        type: "DEPOSIT",
        amount: new Prisma.Decimal(numericAmount),
        status: "PENDING",
        paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
        reference,
        description: `Deposit via ${paymentMethod.provider || paymentMethod.type}`,
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

    return NextResponse.json({
      message: "Payment initiated. Please complete payment on your phone.",
      transaction,
      status: "PENDING",
      providerReference: externalReference || reference,
    });
  } catch (error) {
    console.error("Error processing deposit:", error);
    return NextResponse.json({ error: "Failed to process deposit" }, { status: 500 });
  }
}
