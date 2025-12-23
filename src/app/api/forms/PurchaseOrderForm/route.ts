import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
	buildPurchaseOrderData,
	handlePurchaseOrderApiError,
	normalizePurchaseItems,
	purchaseOrderCreateSchema,
} from "./helpers";

export async function GET() {
	try {
		const orders = await prisma.purchaseOrder.findMany({
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
		const body = await request.json();
		const payload = purchaseOrderCreateSchema.parse(body);
		const items = normalizePurchaseItems(payload.items);

		if (items.length === 0) {
			return NextResponse.json({ error: "At least one valid order item is required" }, { status: 400 });
		}

		const data = buildPurchaseOrderData(payload);

		const createData = {
			...data,
			termsAccepted: true,
			bestMarketPrice: payload.bestMarketPrice ?? false,
			priceLimit: payload.priceLimit ?? false,
			items: {
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

		return NextResponse.json({ data: order }, { status: 201 });
	} catch (error) {
		return handlePurchaseOrderApiError(error, "Failed to create purchase order");
	}
}
