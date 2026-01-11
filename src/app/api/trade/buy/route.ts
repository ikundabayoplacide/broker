import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { Decimal } from "@prisma/client/runtime/library";

interface AuthUser {
  userId?: string;
  id?: string;
}

export async function POST(request: NextRequest) {
  console.log('🛒 BUY SHARES API - Request received');
  
  try {
    // Authenticate user
    console.log('🔐 BUY SHARES - Authenticating user');
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      console.log('❌ BUY SHARES - Authentication failed');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = authResult.userId || authResult.id;
    console.log('✅ BUY SHARES - User authenticated:', userId);
    
    if (!userId) {
      console.log('❌ BUY SHARES - User ID not found');
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    console.log('📝 BUY SHARES - Request body:', JSON.stringify(body, null, 2));
    
    const { companySymbol, quantity, priceType = "MARKET" } = body;

    // Validate input
    if (!companySymbol || !quantity) {
      console.log('❌ BUY SHARES - Missing required fields');
      return NextResponse.json(
        { error: "Company symbol and quantity are required" },
        { status: 400 }
      );
    }

    if (quantity <= 0 || quantity % 100 !== 0) {
      console.log('❌ BUY SHARES - Invalid quantity:', quantity);
      return NextResponse.json(
        { error: "Quantity must be a positive multiple of 100" },
        { status: 400 }
      );
    }

    console.log('🔄 BUY SHARES - Starting transaction');
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the company by symbol
      console.log('🔍 BUY SHARES - Looking for company:', companySymbol);
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

      console.log('🏢 BUY SHARES - Company found:', company);

      if (!company) {
        console.log('❌ BUY SHARES - Company not found');
        throw new Error(`Company with symbol '${companySymbol}' not found`);
      }

      // 2. Determine the price to use
      const price = company.closingPrice || company.sharePrice;
      console.log('💰 BUY SHARES - Price determined:', price);
      
      if (!price || Number(price) <= 0) {
        console.log('❌ BUY SHARES - Invalid price');
        throw new Error("Invalid share price for this company");
      }

      // 3. Check available shares
      const availableShares = company.availableShares ? Number(company.availableShares) : 0;
      console.log('📊 BUY SHARES - Available shares:', availableShares, 'Requested:', quantity);
      
      if (availableShares < quantity) {
        console.log('❌ BUY SHARES - Insufficient shares available');
        throw new Error(`Insufficient shares available. Only ${availableShares} shares available`);
      }

      // 4. Calculate total amount
      const priceDecimal = new Decimal(price.toString());
      const totalAmount = priceDecimal.mul(quantity);
      console.log('💵 BUY SHARES - Total amount calculated:', totalAmount.toString());

      // 5. Get user's wallet
      console.log('💳 BUY SHARES - Fetching wallet for user:', userId);
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      console.log('💳 BUY SHARES - Wallet found:', wallet);

      if (!wallet) {
        console.log('❌ BUY SHARES - Wallet not found');
        throw new Error("Wallet not found. Please contact support.");
      }

      // 6. Check balance
      const walletBalance = new Decimal(wallet.balance.toString());
      console.log('💰 BUY SHARES - Balance check:', {
        walletBalance: walletBalance.toString(),
        requiredAmount: totalAmount.toString(),
        hasSufficientFunds: walletBalance.greaterThanOrEqualTo(totalAmount)
      });
      
      if (walletBalance.lessThan(totalAmount)) {
        console.log('❌ BUY SHARES - Insufficient balance');
        throw new Error(
          `Insufficient balance. Required: Rwf ${totalAmount.toFixed(2)}, Available: Rwf ${wallet.balance.toString()}`
        );
      }

      // 7. Create trade record
      console.log('📝 BUY SHARES - Creating trade record');
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
          fees: new Decimal(0),
          executedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log('✅ BUY SHARES - Trade record created with EXECUTED status:', trade.id);

      // 7.1. Create user transaction record
      console.log('📝 BUY SHARES - Creating user transaction record');
      await tx.transaction.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          type: "BUY_SHARES",
          amount: totalAmount.neg(), // Negative because it's an expense
          status: "COMPLETED",
          reference: `TRADE-${trade.id}`,
          description: `Purchase of ${quantity} shares of ${company.symbol} at Rwf ${priceDecimal.toFixed(2)} per share`,
          metadata: { tradeId: trade.id, companyId: company.id, companySymbol: company.symbol, quantity, pricePerShare: priceDecimal.toNumber() },
          updatedAt: new Date(),
        },
      });
      console.log('✅ BUY SHARES - User transaction record created');

      // 8. Update user's wallet balance
      console.log('💳 BUY SHARES - Updating user wallet balance');
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: totalAmount,
          },
        },
      });
      console.log('✅ BUY SHARES - User wallet updated. New balance:', updatedWallet.balance.toString());

      // 8.1. Ensure company has a wallet (create if missing)
      console.log('💰 BUY SHARES - Checking/creating company wallet');
      let companyWallet = await tx.companyWallet.findUnique({
        where: { companyId: company.id },
      });
      
      if (!companyWallet) {
        console.log('⚠️ BUY SHARES - Company wallet not found, creating one');
        companyWallet = await tx.companyWallet.create({
          data: {
            id: crypto.randomUUID(),
            companyId: company.id,
            balance: new Decimal(0),
            lockedBalance: new Decimal(0),
            updatedAt: new Date(),
          },
        });
        console.log('✅ BUY SHARES - Company wallet created');
      }
      
      console.log('💰 BUY SHARES - Company wallet before update:', companyWallet.balance.toString());
      
      // 8.2. Add money to company's wallet
      const updatedCompanyWallet = await tx.companyWallet.update({
        where: { companyId: company.id },
        data: {
          balance: {
            increment: totalAmount,
          },
        },
      });
      console.log('✅ BUY SHARES - Company wallet updated. New balance:', updatedCompanyWallet.balance.toString());

      // 8.3. Update company's available shares
      console.log('📊 BUY SHARES - Updating company available shares');
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data: {
          availableShares: {
            decrement: BigInt(quantity),
          },
          tradedValue: {
            increment: totalAmount,
          },
          tradedVolume: {
            increment: new Decimal(quantity.toString()),
          },
        },
      });

      // 8.3. Create transaction record for company
      console.log('📝 BUY SHARES - Creating company transaction record');
      await tx.companyTransaction.create({
        data: {
          id: crypto.randomUUID(),
          companyId: company.id,
          type: "SELL_SHARES",
          amount: totalAmount,
          status: "COMPLETED",
          reference: `TRADE-${trade.id}`,
          description: `Sale of ${quantity} shares to user ${userId} at Rwf ${priceDecimal.toFixed(2)} per share`,
          metadata: { tradeId: trade.id, buyerUserId: userId, quantity, pricePerShare: priceDecimal.toNumber() },
          updatedAt: new Date(),
        },
      });
      console.log('✅ BUY SHARES - Company transaction record created');

      // 9. Update or create portfolio entry
      console.log('📊 BUY SHARES - Updating portfolio');
      const existingPortfolio = await tx.portfolio.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId: company.id,
          },
        },
      });

      if (existingPortfolio) {
        console.log('📈 BUY SHARES - Updating existing portfolio');
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
        console.log('📈 BUY SHARES - Creating new portfolio entry');
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
      console.log('✅ BUY SHARES - Portfolio updated');

      // 10. Verify final wallet balances
      console.log('🔍 BUY SHARES - Verifying final wallet balances');
      const finalUserWallet = await tx.wallet.findUnique({ where: { userId } });
      const finalCompanyWallet = await tx.companyWallet.findUnique({ where: { companyId: company.id } });
      
      console.log('💳 BUY SHARES - Final balances:', {
        userWallet: finalUserWallet?.balance.toString(),
        companyWallet: finalCompanyWallet?.balance.toString()
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
        newBalance: updatedWallet.balance.toString(),
      };
    }, {
      timeout: 15000 // 15 second timeout
    });

    console.log('🎉 BUY SHARES - Transaction completed successfully');
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
