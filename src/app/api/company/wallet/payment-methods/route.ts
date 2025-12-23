import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCompany } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(req);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paymentMethods = await prisma.companyPaymentMethod.findMany({
      where: { companyId: auth.companyId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json({ error: "Failed to fetch payment methods" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(req);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, provider, accountNumber, accountName, isDefault } = await req.json();

    if (isDefault) {
      await prisma.companyPaymentMethod.updateMany({
        where: { companyId: auth.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.companyPaymentMethod.create({
      data: {
        id: crypto.randomUUID(),
        companyId: auth.companyId,
        type,
        provider,
        accountNumber,
        accountName,
        isDefault,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ paymentMethod }, { status: 201 });
  } catch (error) {
    console.error("Error adding payment method:", error);
    return NextResponse.json({ error: "Failed to add payment method" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(req);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Payment method ID required" }, { status: 400 });
    }

    await prisma.companyPaymentMethod.delete({
      where: { id, companyId: auth.companyId },
    });

    return NextResponse.json({ message: "Payment method deleted" });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json({ error: "Failed to delete payment method" }, { status: 500 });
  }
}
