import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
	buildPurchaseOrderData,
	handlePurchaseOrderApiError,
	normalizePurchaseItems,
	purchaseOrderUpdateSchema,
} from "../helpers";

type RouteParams = Promise<{ id: string }>;

export async function GET(_request: Request, context: { params: RouteParams }) {
	const { id } = await context.params;

	try {
		const order = await prisma.purchaseOrder.findUnique({
			where: { id },
			include: { PurchaseOrderItem: true },
		});

		if (!order) {
			return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
		}

		return NextResponse.json({ data: order });
	} catch (error) {
		return handlePurchaseOrderApiError(error, "Failed to fetch purchase order");
	}
}

export async function PATCH(request: Request, context: { params: RouteParams }) {
	const { id } = await context.params;

	try {
		const body = await request.json();
		const payload = purchaseOrderUpdateSchema.parse(body);

		if (Object.keys(payload).length === 0) {
			return NextResponse.json({ error: "No fields provided for update" }, { status: 400 });
		}

		const data = buildPurchaseOrderData(payload);
		const items = payload.items ? normalizePurchaseItems(payload.items) : undefined;

		if (payload.items && items && items.length === 0) {
			return NextResponse.json({ error: "Updated order must include at least one item" }, { status: 400 });
		}

		const order = await prisma.$transaction(async (tx) => {
			if (items) {
				await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
			}

			return tx.purchaseOrder.update({
				where: { id },
				data: {
					...Object.fromEntries(
						Object.entries(data).filter(([, value]) => value !== undefined)
					),
					...(items
						? {
							PurchaseOrderItem: {
								create: items,
							},
						}
						: {}),
				},
				include: { PurchaseOrderItem: true },
			});
		});

		return NextResponse.json({ data: order });
	} catch (error) {
		return handlePurchaseOrderApiError(error, "Failed to update purchase order");
	}
}

export async function DELETE(_request: Request, context: { params: RouteParams }) {
	const { id } = await context.params;

	try {
		await prisma.purchaseOrder.delete({ where: { id } });
		return NextResponse.json({ success: true });
	} catch (error) {
		return handlePurchaseOrderApiError(error, "Failed to delete purchase order");
	}
}
