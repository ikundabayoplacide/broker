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
    const { companySymbol, quantity, priceType = "MARKET" } = body;

    if (!companySymbol || !quantity) {
      return NextResponse.json({ error: "Company symbol and quantity are required" }, { status: 400 });
    }

    if (quantity <= 0 || quantity % 100 !== 0) {
      return NextResponse.json({ error: "Quantity must be a positive multiple of 100" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const targetCompany = await tx.company.findFirst({
        where: { symbol: companySymbol },
        select: { id: true, symbol: true, name: true, sharePrice: true, closingPrice: true, availableShares: true },
      });

      if (!targetCompany) {
        throw new Error(`Company with symbol '${companySymbol}' not found`);
      }

      const price = targetCompany.closingPrice || targetCompany.sharePrice;
      if (!price || Number(price) <= 0) {
        throw new Error("Invalid share price for this company");
      }

      const availableShares = targetCompany.availableShares ? Number(targetCompany.availableShares) : 0;
      if (availableShares < quantity) {
        throw new Error(`Insufficient shares available. Only ${availableShares} shares available`);
      }

      const priceDecimal = new Decimal(price.toString());
      const totalAmount = priceDecimal.mul(quantity);

      const wallet = await tx.companyWallet.findUnique({ where: { companyId } });
      if (!wallet) {
        throw new Error("Wallet not found. Please contact support.");
      }

      if (new Decimal(wallet.balance.toString()).lessThan(totalAmount)) {
        throw new Error(`Insufficient balance. Required: Rwf ${totalAmount.toFixed(2)}, Available: Rwf ${wallet.balance.toString()}`);
      }

      const trade = await tx.companyTrade.create({
        data: {
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
        },
      });

      await tx.companyWallet.update({
        where: { companyId },
        data: { balance: { decrement: totalAmount } },
      });

      await tx.companyTransaction.create({
        data: {
          companyId,
          type: "BUY_SHARES",
          amount: totalAmount,
          status: "COMPLETED",
          reference: `TRADE-${trade.id}`,
          description: `Purchase of ${quantity} shares of ${targetCompany.symbol} at Rwf ${priceDecimal.toFixed(2)} per share`,
          metadata: { tradeId: trade.id, targetCompanyId: targetCompany.id, companySymbol: targetCompany.symbol, quantity, pricePerShare: priceDecimal.toNumber() },
        },
      });

      const existingPortfolio = await tx.companyPortfolio.findUnique({
        where: { companyId_targetCompanyId: { companyId, targetCompanyId: targetCompany.id } },
      });

      if (existingPortfolio) {
        const newQuantity = existingPortfolio.quantity + quantity;
        const newTotalInvested = new Decimal(existingPortfolio.totalInvested.toString()).add(totalAmount);
        const newAverageBuyPrice = newTotalInvested.div(newQuantity);
        await tx.companyPortfolio.update({
          where: { companyId_targetCompanyId: { companyId, targetCompanyId: targetCompany.id } },
          data: { quantity: newQuantity, averageBuyPrice: newAverageBuyPrice, totalInvested: newTotalInvested },
        });
      } else {
        await tx.companyPortfolio.create({
          data: { companyId, targetCompanyId: targetCompany.id, quantity, averageBuyPrice: priceDecimal, totalInvested: totalAmount },
        });
      }

      const newAvailableShares = BigInt(availableShares - quantity);
      const currentCompany = await tx.company.findUnique({
        where: { id: targetCompany.id },
        select: { closingPrice: true },
      });
      const oldClosingPrice = currentCompany?.closingPrice || priceDecimal;
      const priceChangeInCents = Number(priceDecimal) - Number(oldClosingPrice);

      await tx.company.update({
        where: { id: targetCompany.id },
        data: {
          availableShares: newAvailableShares,
          closingPrice: priceDecimal,
          previousClosingPrice: oldClosingPrice,
          priceChange: priceChangeInCents.toFixed(2),
          tradedVolume: { increment: new Decimal(quantity.toString()) },
          tradedValue: { increment: totalAmount },
          snapshotDate: new Date(),
        },
      });

      const updatedWallet = await tx.companyWallet.findUnique({ where: { companyId } });

      return {
        trade,
        company: { id: targetCompany.id, symbol: targetCompany.symbol, name: targetCompany.name },
        transaction: { quantity, pricePerShare: priceDecimal.toNumber(), totalAmount: totalAmount.toNumber() },
        newBalance: updatedWallet?.balance.toString() || "0",
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${quantity} shares of ${result.company.symbol}`,
      data: result,
    });
  } catch (error) {
    console.error("Trade error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to execute trade" }, { status: 400 });
  }
}
