import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCompany } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(request);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: auth.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        symbol: true,
        sector: true,
        sharePrice: true,
        closingPrice: true,
        previousClosingPrice: true,
        priceChange: true,
        totalShares: true,
        availableShares: true,
        marketCap: true,
        tradedVolume: true,
        tradedValue: true,
        snapshotDate: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Calculate additional metrics if missing
    const sharePrice = Number(company.sharePrice || 0);
    const totalShares = Number(company.totalShares || 0);
    const calculatedMarketCap = sharePrice * totalShares;

    return NextResponse.json({ 
      company: {
        ...company,
        sharePrice: sharePrice,
        totalShares: totalShares,
        availableShares: Number(company.availableShares || 0),
        marketCap: Number(company.marketCap || calculatedMarketCap),
        tradedVolume: Number(company.tradedVolume || 0),
        tradedValue: Number(company.tradedValue || 0),
        priceChange: company.priceChange || "0.00",
        peRatio: sharePrice > 0 ? (sharePrice / 10).toFixed(2) : "0.00", // Mock P/E ratio
        weekHigh52: sharePrice * 1.2, // Mock 52W high
        weekLow52: sharePrice * 0.8,  // Mock 52W low
      }
    });
  } catch (error) {
    console.error("Error fetching company details:", error);
    return NextResponse.json({ error: "Failed to fetch company details" }, { status: 500 });
  }
}
