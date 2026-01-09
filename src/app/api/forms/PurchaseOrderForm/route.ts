import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import {
	buildPurchaseOrderData,
	handlePurchaseOrderApiError,
	normalizePurchaseItems,
	purchaseOrderCreateSchema,
} from "./helpers";

export async function GET(request: Request) {
	try {
		// Get authenticated user
		const auth = await getAuthenticatedUser(request as any);
		if (!auth?.userId) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		// Get user role from database
		const user = await prisma.user.findUnique({
			where: { id: auth.userId },
			select: { role: true }
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Filter orders based on role
		const whereClause = user.role.toUpperCase() === 'CLIENT' 
			? { userId: auth.userId } 
			: {}; // Tellers and managers see all orders

		const orders = await prisma.purchaseOrder.findMany({
			where: whereClause,
			orderBy: { createdAt: "desc" },
			include: { PurchaseOrderItem: true },
		});
		return NextResponse.json({ data: orders });
	} catch (error) {
		return handlePurchaseOrderApiError(error, "Failed to fetch purchase orders");
	}
}

export async function POST(request: Request) {
	try {
		// Get authenticated user
		const auth = await getAuthenticatedUser(request as any);
		if (!auth?.userId) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		const body = await request.json();
		const payload = purchaseOrderCreateSchema.parse(body);
		const items = normalizePurchaseItems(payload.items);

		if (items.length === 0) {
			return NextResponse.json({ error: "At least one valid order item is required" }, { status: 400 });
		}

		// Use userId from payload if provided, otherwise use authenticated user's ID
		const targetUserId = payload.userId || auth.userId;
		console.log('🔍 Backend Purchase Order Debug:', {
			authUserId: auth.userId,
			payloadUserId: (payload as any).userId,
			targetUserId,
			orderFor: (payload as any).orderFor
		});
		const data = buildPurchaseOrderData(payload, targetUserId);

		const createData = {
			id: randomUUID(),
			...data,
			termsAccepted: true,
			bestMarketPrice: payload.bestMarketPrice ?? false,
			priceLimit: payload.priceLimit ?? false,
			updatedAt: new Date(),
			PurchaseOrderItem: {
				create: items,
			},
		};

		const cleanedCreateData = Object.fromEntries(
			Object.entries(createData).filter(([, value]) => value !== undefined)
		) as unknown as Prisma.PurchaseOrderCreateInput;

		const order = await prisma.purchaseOrder.create({
			data: cleanedCreateData,
			include: { PurchaseOrderItem: true },
		});

		return NextResponse.json({ 
			data: order, 
			id: order.id,
			userId: order.userId 
		}, { status: 201 });
	} catch (error) {
		return handlePurchaseOrderApiError(error, "Failed to create purchase order");
	}
}
