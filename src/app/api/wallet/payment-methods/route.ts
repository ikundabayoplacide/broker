import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { v4 as uuidv4 } from 'uuid';

// GET /api/wallet/payment-methods - Get all payment methods for the current user
export async function GET(req: NextRequest) {
  try {
    console.log("Payment methods GET - Headers:", {
      authorization: req.headers.get("authorization"),
      hasCookie: !!req.cookies.get("token"),
    });
    
    const auth = await getAuthenticatedUser(req);
    if (!auth || !auth.userId) {
      console.log("Payment methods GET - Auth failed:", { auth });
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("Payment methods GET - Auth successful:", { userId: auth.userId });

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: auth.userId },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ paymentMethods }, { status: 200 });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

// POST /api/wallet/payment-methods - Add a new payment method
export async function POST(req: NextRequest) {
  try {
    console.log("Payment methods POST - Headers:", {
      authorization: req.headers.get("authorization"),
      hasCookie: !!req.cookies.get("token"),
    });
    
    const auth = await getAuthenticatedUser(req);
    if (!auth || !auth.userId) {
      console.log("Payment methods POST - Auth failed:", { auth });
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("Payment methods POST - Auth successful:", { userId: auth.userId });

    const body = await req.json();
    console.log("Payment methods POST - Request body:", body);
    
    const { type, provider, accountNumber, accountName, isDefault, metadata } = body;

    // Validate required fields
    if (!type || !accountNumber) {
      console.log("Payment methods POST - Validation failed:", { type, accountNumber });
      return NextResponse.json(
        { error: "Type and account number are required" },
        { status: 400 }
      );
    }

    // Validate type enum
    const validTypes = ['MOBILE_MONEY', 'BANK_ACCOUNT', 'CREDIT_CARD'];
    if (!validTypes.includes(type)) {
      console.log("Payment methods POST - Invalid type:", { type, validTypes });
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: auth.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create the payment method with explicit ID
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        id: uuidv4(),
        userId: auth.userId,
        type,
        provider: provider || null,
        accountNumber,
        accountName: accountName || null,
        isDefault: isDefault ?? false,
        metadata: metadata || null,
        updatedAt: new Date(),
      },
    });

    console.log("Payment methods POST - Created successfully:", { id: paymentMethod.id });

    return NextResponse.json(
      { message: "Payment method added successfully", paymentMethod },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding payment method:", error);
    return NextResponse.json(
      { error: "Failed to add payment method" },
      { status: 500 }
    );
  }
}// DELETE /api/wallet/payment-methods - Delete a payment method
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paymentMethodId = searchParams.get("id");

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method ID is required" },
        { status: 400 }
      );
    }

    // Verify the payment method belongs to the user
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId: auth.userId },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    await prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });

    return NextResponse.json(
      { message: "Payment method deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
