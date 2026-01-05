import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCompany } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedCompany(request);
    if (!authResult || !authResult.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = authResult.companyId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    // Fetch company transactions
    const transactions = await prisma.companyTransaction.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Fetch company trades
    const trades = await prisma.companyTrade.findMany({
      where: { companyId },
      include: {
        Company_CompanyTrade_targetCompanyIdToCompany: {
          select: { name: true, symbol: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      transactions,
      trades,
    });
  } catch (error) {
    console.error("Error fetching company history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}