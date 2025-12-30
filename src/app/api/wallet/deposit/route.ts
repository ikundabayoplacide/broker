import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { paypackClient, PaypackClient, PaypackError } from "@/lib/paypack";
import { v4 as uuidv4 } from 'uuid';

// POST /api/wallet/deposit - Deposit money to wallet
export async function POST(req: NextRequest) {
  console.log("=== DEPOSIT REQUEST START ===");
  
  try {
    // Step 1: Authentication
    console.log("Step 1: Authenticating user...");
    const auth = await getAuthenticatedUser(req);
    if (!auth || !auth.userId) {
      console.log("❌ Authentication failed:", { auth });
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    console.log("✅ Authentication successful:", { userId: auth.userId });

    const userId = auth.userId;

    // Step 2: Parse request body
    console.log("Step 2: Parsing request body...");
    const body = await req.json();
    console.log("📝 Request body:", body);
    
    const { amount, paymentMethodId } = body;
    const numericAmount = Number(amount);
    console.log("💰 Parsed amount:", { amount, numericAmount, paymentMethodId });

    // Step 3: Validate amount
    console.log("Step 3: Validating amount...");
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount < 100) {
      console.log("❌ Invalid amount:", { numericAmount, isNaN: Number.isNaN(numericAmount) });
      return NextResponse.json(
        { error: "Invalid amount. Minimum deposit is 100 RWF" },
        { status: 400 }
      );
    }
    console.log("✅ Amount validation passed");

    // Step 4: Validate payment method ID
    console.log("Step 4: Validating payment method...");
    if (!paymentMethodId) {
      console.log("❌ Payment method ID missing");
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

    // Step 5: Get payment method from database
    console.log("Step 5: Fetching payment method from database...");
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId: userId, isActive: true },
    });
    console.log("🔍 Payment method query result:", paymentMethod ? {
      id: paymentMethod.id,
      type: paymentMethod.type,
      provider: paymentMethod.provider,
      accountNumber: paymentMethod.accountNumber,
      isActive: paymentMethod.isActive
    } : null);

    if (!paymentMethod) {
      console.log("❌ Payment method not found or inactive");
      return NextResponse.json(
        { error: "Payment method not found or inactive" },
        { status: 404 }
      );
    }
    console.log("✅ Payment method found and active");

    // Step 6: Generate unique reference
    console.log("Step 6: Generating transaction reference...");
    const reference = `DEP${Date.now()}${Math.floor(Math.random() * 10000)}`;
    console.log("📋 Generated reference:", reference);

    // Step 7: Check if user has a wallet (create if not exists)
    console.log("Step 7: Ensuring user wallet exists...");
    let wallet = await prisma.wallet.findUnique({
      where: { userId: userId }
    });
    
    if (!wallet) {
      console.log("💳 Creating new wallet for user...");
      wallet = await prisma.wallet.create({
        data: {
          id: uuidv4(),
          userId: userId,
          balance: new Prisma.Decimal(0),
          lockedBalance: new Prisma.Decimal(0),
          updatedAt: new Date()
        }
      });
      console.log("✅ Wallet created:", { walletId: wallet.id });
    } else {
      console.log("✅ Wallet exists:", { walletId: wallet.id, balance: wallet.balance.toString() });
    }

    // Step 8: Process payment
    console.log("Step 8: Processing payment...");
    let paypackResponse: Record<string, unknown> | null = null;
    let externalStatus: string | undefined;
    let externalReference: string | undefined;

    // Check if Paypack credentials are available and test mode setting
    const hasPaypackCredentials = !!(process.env.PAYPACK_APP_ID && process.env.PAYPACK_APP_SECRET);
    const isTestMode = process.env.PAYPACK_TEST_MODE === 'true' || !hasPaypackCredentials;
    console.log("🧪 Test mode check:", { isTestMode, testModeEnv: process.env.PAYPACK_TEST_MODE, hasPaypackCredentials });
    
    console.log("🔧 Paypack environment check:", {
      hasBaseUrl: !!process.env.PAYPACK_BASE_URL,
      hasAppId: !!process.env.PAYPACK_APP_ID,
      hasAppSecret: !!process.env.PAYPACK_APP_SECRET,
      baseUrl: process.env.PAYPACK_BASE_URL,
      isTestMode,
    });

    if (paymentMethod.type === "MOBILE_MONEY") {
      console.log("📱 Processing mobile money payment...");
      const formattedPhone = paymentMethod.accountNumber.trim();
      console.log("📞 Phone number:", formattedPhone);

      if (isTestMode) {
        console.log("🧪 Test mode: Simulating successful Paypack response");
        paypackResponse = {
          ref: reference,
          status: "SUCCESS",
          amount: numericAmount,
          number: formattedPhone,
          currency: "RWF",
          description: `Wallet deposit for ${userId}`,
          processor_message: "Test mode - payment simulated",
        };
        externalStatus = "SUCCESS";
        externalReference = reference;
      } else {
        try {
          console.log("🚀 Initiating Paypack cashIn with:", {
            amount: numericAmount,
            phone: formattedPhone,
            reference,
            description: `Wallet deposit for ${userId}`,
          });

          const response = await paypackClient.cashIn({
            amount: numericAmount,
            phone: formattedPhone,
            reference,
            description: `Wallet deposit for ${userId}`,
          });

          console.log("📨 Paypack cashIn response:", response);

          paypackResponse = response;
          externalStatus = typeof response.status === "string" ? response.status : undefined;
          externalReference = (response.ref as string | undefined) ?? reference;

          console.log("🔄 Processed Paypack response:", {
            externalStatus,
            externalReference,
            isFailed: PaypackClient.isFailed(externalStatus),
          });

          // Set status as PENDING - will be updated via webhook when user completes payment
          externalStatus = "PENDING";

          if (PaypackClient.isFailed(externalStatus)) {
            console.log("❌ Paypack payment failed, creating failed transaction...");
            const failedTransaction = await prisma.transaction.create({
              data: {
                id: uuidv4(),
                userId: userId,
                type: "DEPOSIT",
                amount: new Prisma.Decimal(numericAmount),
                status: "FAILED",
                paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
                reference,
                description: response.processor_message || "Deposit declined by Paypack",
                metadata: {
                  paymentMethodId,
                  accountNumber: paymentMethod.accountNumber,
                  paypack: JSON.parse(JSON.stringify(response)),
                },
                updatedAt: new Date()
              },
            });
            console.log("💾 Failed transaction created:", { transactionId: failedTransaction.id });

            return NextResponse.json(
              { error: response.processor_message || "Deposit declined" },
              { status: 400 }
            );
          }
        } catch (error) {
          console.error("💥 Paypack cashIn error details:", {
            error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            isPaypackError: error instanceof PaypackError,
          });
          
          let message = error instanceof PaypackError ? error.message : "Paypack deposit failed";
          
          // Provide helpful message for unsupported provider error
          if (message.includes('unsupported provider')) {
            message = `Phone number ${formattedPhone} is not whitelisted in your Paypack dashboard. Please add this number to your Paypack merchant account's whitelist before attempting payment.`;
          }

          console.log("💾 Creating failed transaction due to Paypack error...");
          const errorTransaction = await prisma.transaction.create({
            data: {
              id: uuidv4(),
              userId: userId,
              type: "DEPOSIT",
              amount: new Prisma.Decimal(numericAmount),
              status: "FAILED",
              paymentMethod: `${paymentMethod.type} - ${paymentMethod.provider || ""}`,
              reference,
              description: message,
              metadata: {
                paymentMethodId,
                accountNumber: paymentMethod.accountNumber,
                error: error instanceof Error ? error.message : String(error),
              },
              updatedAt: new Date()
            },
          });
          console.log("💾 Error transaction created:", { transactionId: errorTransaction.id });

          return NextResponse.json({ error: message }, { status: 400 });
        }
      }
    } else {
      console.log("💳 Non-mobile money payment method, setting as pending...");
      externalStatus = "PENDING";
      externalReference = reference;
    }

    // Step 9: Create transaction record
    console.log("Step 9: Creating transaction record...");
    const transaction = await prisma.transaction.create({
      data: {
        id: uuidv4(),
        userId: userId,
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
        updatedAt: new Date()
      },
    });
    console.log("✅ Transaction created successfully:", { transactionId: transaction.id });

    console.log("=== DEPOSIT REQUEST SUCCESS ===");
    return NextResponse.json(
      {
        message: "Payment initiated. Please complete payment on your phone.",
        transaction,
        status: "PENDING",
        providerReference: externalReference || reference,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("💥 CRITICAL ERROR in deposit processing:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    console.log("=== DEPOSIT REQUEST FAILED ===");
    
    return NextResponse.json(
      { error: "Failed to process deposit" },
      { status: 500 }
    );
  }
}
