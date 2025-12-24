import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companySymbol = searchParams.get("symbol");

    if (!companySymbol) {
      return NextResponse.json({ error: "Company symbol is required" }, { status: 400 });
    }
    // First get the company ID from the symbol
    const company = await prisma.company.findUnique({
      where: { symbol: companySymbol },
      select: { id: true }
    });

    if (!company) {
      return NextResponse.json({
        success: true,
        data: {
          companySymbol,
          totalShares: 0
        }
      });
    }

    // Get user's holdings for the specific company
    const holdings = await prisma.trade.aggregate({
      where: {
        userId: decoded.userId,
        companyId: company.id,
        status: "EXECUTED"
      },
      _sum: {
        executedQuantity: true
      }
    });

    const totalShares = holdings._sum.executedQuantity || 0;

    return NextResponse.json({
      success: true,
      data: {
        companySymbol,
        totalShares
      }
    });

  } catch (error) {
    console.error("Error fetching holdings:", error);
    return NextResponse.json(
      { error: "Failed to fetch holdings" },
      { status: 500 }
    );
  }
}