import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCompany } from "@/lib/apiAuth";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(request: NextRequest) {
  console.log('🚀🚀🚀 COMPANY TRADE BUY ROUTE HIT - THIS SHOULD SHOW IN LOGS 🚀🚀🚀');
  console.log('📍 Route: /api/company/trade/buy');
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  try {
    const authResult = await getAuthenticatedCompany(request);
    console.log('🔐 COMPANY TRADE BUY - Auth result:', { companyId: authResult?.companyId });
    
    if (!authResult || !authResult.companyId) {
      console.log('❌ COMPANY TRADE BUY - Unauthorized access');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = authResult.companyId;
    const body = await request.json();
    console.log('📝 COMPANY TRADE BUY - Request body:', body);
    
    const { companySymbol, targetCompanyId, quantity, priceType = "MARKET" } = body;

    if ((!companySymbol && !targetCompanyId) || !quantity) {
      console.log('❌ COMPANY TRADE BUY - Missing required fields');
      return NextResponse.json({ error: "Company symbol or target company ID and quantity are required" }, { status: 400 });
    }

    if (quantity <= 0 || quantity % 100 !== 0) {
      console.log('❌ COMPANY TRADE BUY - Invalid quantity:', quantity);
      return NextResponse.json({ error: "Quantity must be a positive multiple of 100" }, { status: 400 });
    }

    console.log('🔍 COMPANY TRADE BUY - Finding target company...');
    const targetCompany = await prisma.company.findFirst({
      where: companySymbol ? { symbol: companySymbol } : { id: targetCompanyId },
      select: { id: true, symbol: true, name: true, sharePrice: true, closingPrice: true, availableShares: true },
    });
    console.log('🏢 COMPANY TRADE BUY - Target company found:', targetCompany);

    if (!targetCompany) {
      console.log('❌ COMPANY TRADE BUY - Target company not found');
      return NextResponse.json({ error: `Company ${companySymbol ? `with symbol '${companySymbol}'` : `with ID '${targetCompanyId}'`} not found` }, { status: 404 });
    }

    const price = targetCompany.closingPrice || targetCompany.sharePrice;
    console.log('💰 COMPANY TRADE BUY - Price determined:', price);
    
    if (!price || Number(price) <= 0) {
      console.log('❌ COMPANY TRADE BUY - Invalid price');
      return NextResponse.json({ error: "Invalid share price for this company" }, { status: 400 });
    }

    const availableShares = targetCompany.availableShares ? Number(targetCompany.availableShares) : 0;
    console.log('📊 COMPANY TRADE BUY - Available shares:', availableShares);
    
    if (availableShares < quantity) {
      console.log('❌ COMPANY TRADE BUY - Insufficient shares');
      return NextResponse.json({ error: `Insufficient shares available. Only ${availableShares} shares available` }, { status: 400 });
    }

    const priceDecimal = new Decimal(price.toString());
    const totalAmount = priceDecimal.mul(quantity);
    console.log('💵 COMPANY TRADE BUY - Total amount calculated:', totalAmount.toString());

    console.log('🔍 COMPANY TRADE BUY - Finding buyer wallet...');
    const wallet = await prisma.companyWallet.findUnique({ where: { companyId } });
    console.log('💳 COMPANY TRADE BUY - Buyer wallet:', { balance: wallet?.balance.toString() });
    
    if (!wallet) {
      console.log('❌ COMPANY TRADE BUY - Wallet not found');
      return NextResponse.json({ error: "Wallet not found. Please contact support." }, { status: 404 });
    }

    if (new Decimal(wallet.balance.toString()).lessThan(totalAmount)) {
      console.log('❌ COMPANY TRADE BUY - Insufficient balance');
      return NextResponse.json({ error: `Insufficient balance. Required: Rwf ${totalAmount.toFixed(2)}, Available: Rwf ${wallet.balance.toString()}` }, { status: 400 });
    }

    const tradeId = crypto.randomUUID();
    const transactionId = crypto.randomUUID();
    const portfolioId = crypto.randomUUID();
    console.log('🆔 COMPANY TRADE BUY - Generated IDs:', { tradeId, transactionId, portfolioId });

    console.log('🔄 COMPANY TRADE BUY - Starting database transaction...');
    // Execute trade in a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      console.log('📝 COMPANY TRADE BUY - Creating trade record...');
      const trade = await tx.companyTrade.create({
        data: {
          id: tradeId,
          companyId,
          targetCompanyId: targetCompany.id,
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
      console.log('✅ COMPANY TRADE BUY - Trade record created:', trade.id);

      console.log('💸 COMPANY TRADE BUY - Updating buyer wallet...');
      // Deduct money from buyer's wallet
      await tx.companyWallet.update({
        where: { companyId },
        data: { balance: { decrement: totalAmount } },
      });
      console.log('✅ COMPANY TRADE BUY - Buyer wallet updated (money deducted)');

      console.log('💰 COMPANY TRADE BUY - Updating target company wallet...');
      // Add money to target company's wallet
      await tx.companyWallet.update({
        where: { companyId: targetCompany.id },
        data: { balance: { increment: totalAmount } },
      });
      console.log('✅ COMPANY TRADE BUY - Target company wallet updated (money added)');

      console.log('📋 COMPANY TRADE BUY - Creating buyer transaction record...');
      // Create transaction record for buyer
      await tx.companyTransaction.create({
        data: {
          id: transactionId,
          companyId,
          type: "BUY_SHARES",
          amount: totalAmount,
          status: "COMPLETED",
          reference: `TRADE-${tradeId}`,
          description: `Purchase of ${quantity} shares of ${targetCompany.symbol} at Rwf ${priceDecimal.toFixed(2)} per share`,
          metadata: { tradeId, targetCompanyId: targetCompany.id, companySymbol: targetCompany.symbol, quantity, pricePerShare: priceDecimal.toNumber() },
          updatedAt: new Date(),
        },
      });
      console.log('✅ COMPANY TRADE BUY - Buyer transaction record created');

      console.log('📋 COMPANY TRADE BUY - Creating seller transaction record...');
      // Create transaction record for target company (seller)
      await tx.companyTransaction.create({
        data: {
          id: crypto.randomUUID(),
          companyId: targetCompany.id,
          type: "SELL_SHARES",
          amount: totalAmount,
          status: "COMPLETED",
          reference: `TRADE-${tradeId}`,
          description: `Sale of ${quantity} shares to ${companyId} at Rwf ${priceDecimal.toFixed(2)} per share`,
          metadata: { tradeId, buyerCompanyId: companyId, quantity, pricePerShare: priceDecimal.toNumber() },
          updatedAt: new Date(),
        },
      });
      console.log('✅ COMPANY TRADE BUY - Seller transaction record created');

      console.log('📊 COMPANY TRADE BUY - Checking existing portfolio...');
      const existingPortfolio = await tx.companyPortfolio.findUnique({
        where: { companyId_targetCompanyId: { companyId, targetCompanyId: targetCompany.id } },
      });
      console.log('📊 COMPANY TRADE BUY - Existing portfolio:', existingPortfolio ? 'found' : 'not found');

      if (existingPortfolio) {
        console.log('📊 COMPANY TRADE BUY - Updating existing portfolio...');
        const newQuantity = existingPortfolio.quantity + quantity;
        const newTotalInvested = new Decimal(existingPortfolio.totalInvested.toString()).add(totalAmount);
        const newAverageBuyPrice = newTotalInvested.div(newQuantity);
        await tx.companyPortfolio.update({
          where: { companyId_targetCompanyId: { companyId, targetCompanyId: targetCompany.id } },
          data: { quantity: newQuantity, averageBuyPrice: newAverageBuyPrice, totalInvested: newTotalInvested },
        });
        console.log('✅ COMPANY TRADE BUY - Portfolio updated');
      } else {
        console.log('📊 COMPANY TRADE BUY - Creating new portfolio...');
        await tx.companyPortfolio.create({
          data: {
            id: portfolioId,
            companyId,
            targetCompanyId: targetCompany.id,
            quantity,
            averageBuyPrice: priceDecimal,
            totalInvested: totalAmount,
            updatedAt: new Date(),
          },
        });
        console.log('✅ COMPANY TRADE BUY - New portfolio created');
      }

      console.log('🏢 COMPANY TRADE BUY - Updating target company data...');
      await tx.company.update({
        where: { id: targetCompany.id },
        data: {
          availableShares: BigInt(availableShares - quantity),
          closingPrice: priceDecimal,
          previousClosingPrice: targetCompany.closingPrice || priceDecimal,
          priceChange: "0.00",
          tradedVolume: { increment: new Decimal(quantity.toString()) },
          tradedValue: { increment: totalAmount },
          snapshotDate: new Date(),
        },
      });
      console.log('✅ COMPANY TRADE BUY - Target company data updated');

      console.log('💳 COMPANY TRADE BUY - Getting updated wallet...');
      const updatedWallet = await tx.companyWallet.findUnique({ where: { companyId } });
      console.log('💳 COMPANY TRADE BUY - Updated wallet balance:', updatedWallet?.balance.toString());

      console.log('🔔 COMPANY TRADE BUY - Creating notification...');
      // Create notification for successful trade
      await tx.companyNotification.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          title: "Trade Executed Successfully",
          message: `You have successfully purchased ${quantity} shares of ${targetCompany.symbol} for Rwf ${totalAmount.toFixed(2)}.`,
          type: "TRADE_SUCCESS",
          metadata: { tradeId, targetCompanyId: targetCompany.id, quantity, totalAmount: totalAmount.toNumber() },
          updatedAt: new Date(),
        },
      });
      console.log('✅ COMPANY TRADE BUY - Notification created');

      return {
        trade,
        updatedWallet
      };
    });
    
    console.log('✅ COMPANY TRADE BUY - Transaction completed successfully');

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${quantity} shares of ${targetCompany.symbol}`,
      data: {
        trade: result.trade,
        company: { id: targetCompany.id, symbol: targetCompany.symbol, name: targetCompany.name },
        transaction: { quantity, pricePerShare: priceDecimal.toNumber(), totalAmount: totalAmount.toNumber() },
        newBalance: result.updatedWallet?.balance.toString() || "0",
      },
    });
  } catch (error) {
    console.error('❌ COMPANY TRADE BUY - Error occurred:', error);
    console.error('❌ COMPANY TRADE BUY - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to execute trade" }, { status: 400 });
  }
}
