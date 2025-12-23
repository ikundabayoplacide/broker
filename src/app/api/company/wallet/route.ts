import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCompany } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(req);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    let wallet = await prisma.companyWallet.findUnique({
      where: { companyId: auth.companyId },
    });

    if (!wallet) {
      wallet = await prisma.companyWallet.create({
        data: {
          id: crypto.randomUUID(),
          companyId: auth.companyId,
          balance: 0,
          lockedBalance: 0,
          updatedAt: new Date(),
        },
      });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const transactions = await prisma.companyTransaction.findMany({
      where: { companyId: auth.companyId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const totalTransactions = await prisma.companyTransaction.count({
      where: { companyId: auth.companyId },
    });

    return NextResponse.json({
      wallet: {
        balance: wallet.balance.toString(),
        lockedBalance: wallet.lockedBalance.toString(),
        availableBalance: wallet.balance.minus(wallet.lockedBalance).toString(),
      },
      transactions: transactions.map((t) => ({
        ...t,
        amount: t.amount.toString(),
      })),
      pagination: {
        total: totalTransactions,
        limit,
        offset,
        hasMore: offset + limit < totalTransactions,
      },
    });
  } catch (error) {
    console.error("Error fetching company wallet:", error);
    return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
  }
}
