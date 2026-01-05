import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCompany } from "@/lib/apiAuth";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedCompany(request);
    if (!authResult || !authResult.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = authResult.companyId;
    const body = await request.json();
    const { companySymbol, targetCompanyId, quantity, priceType = "MARKET" } = body;

    if ((!companySymbol && !targetCompanyId) || !quantity) {
      return NextResponse.json({ error: "Company symbol or target company ID and quantity are required" }, { status: 400 });
    }

    if (quantity <= 0 || quantity % 100 !== 0) {
      return NextResponse.json({ error: "Quantity must be a positive multiple of 100" }, { status: 400 });
    }

    const targetCompany = await prisma.company.findFirst({
      where: companySymbol ? { symbol: companySymbol } : { id: targetCompanyId },
      select: { id: true, symbol: true, name: true, sharePrice: true, closingPrice: true, availableShares: true },
    });

    if (!targetCompany) {
      return NextResponse.json({ error: `Company ${companySymbol ? `with symbol '${companySymbol}'` : `with ID '${targetCompanyId}'`} not found` }, { status: 404 });
    }

    const price = targetCompany.closingPrice || targetCompany.sharePrice;
    if (!price || Number(price) <= 0) {
      return NextResponse.json({ error: "Invalid share price for this company" }, { status: 400 });
    }

    const availableShares = targetCompany.availableShares ? Number(targetCompany.availableShares) : 0;
    if (availableShares < quantity) {
      return NextResponse.json({ error: `Insufficient shares available. Only ${availableShares} shares available` }, { status: 400 });
    }

    const priceDecimal = new Decimal(price.toString());
    const totalAmount = priceDecimal.mul(quantity);

    const wallet = await prisma.companyWallet.findUnique({ where: { companyId } });
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found. Please contact support." }, { status: 404 });
    }

    if (new Decimal(wallet.balance.toString()).lessThan(totalAmount)) {
      return NextResponse.json({ error: `Insufficient balance. Required: Rwf ${totalAmount.toFixed(2)}, Available: Rwf ${wallet.balance.toString()}` }, { status: 400 });
    }

    const tradeId = crypto.randomUUID();
    const transactionId = crypto.randomUUID();
    const portfolioId = crypto.randomUUID();

    const trade = await prisma.companyTrade.create({
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

    await prisma.companyWallet.update({
      where: { companyId },
      data: { balance: { decrement: totalAmount } },
    });

    await prisma.companyTransaction.create({
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

    const existingPortfolio = await prisma.companyPortfolio.findUnique({
      where: { companyId_targetCompanyId: { companyId, targetCompanyId: targetCompany.id } },
    });

    if (existingPortfolio) {
      const newQuantity = existingPortfolio.quantity + quantity;
      const newTotalInvested = new Decimal(existingPortfolio.totalInvested.toString()).add(totalAmount);
      const newAverageBuyPrice = newTotalInvested.div(newQuantity);
      await prisma.companyPortfolio.update({
        where: { companyId_targetCompanyId: { companyId, targetCompanyId: targetCompany.id } },
        data: { quantity: newQuantity, averageBuyPrice: newAverageBuyPrice, totalInvested: newTotalInvested },
      });
    } else {
      await prisma.companyPortfolio.create({
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
    }

    await prisma.company.update({
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

    const updatedWallet = await prisma.companyWallet.findUnique({ where: { companyId } });

    // Create notification for successful trade
    await prisma.companyNotification.create({
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

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${quantity} shares of ${targetCompany.symbol}`,
      data: {
        trade,
        company: { id: targetCompany.id, symbol: targetCompany.symbol, name: targetCompany.name },
        transaction: { quantity, pricePerShare: priceDecimal.toNumber(), totalAmount: totalAmount.toNumber() },
        newBalance: updatedWallet?.balance.toString() || "0",
      },
    });
  } catch (error) {
    console.error("Trade error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to execute trade" }, { status: 400 });
  }
}
