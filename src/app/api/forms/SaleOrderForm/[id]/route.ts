import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
	buildSaleOrderData,
	handleSaleOrderApiError,
	normalizeSaleItems,
	saleOrderUpdateSchema,
} from "../helpers";

type RouteParams = Promise<{ id: string }>;

export async function GET(_request: Request, context: { params: RouteParams }) {
	const { id } = await context.params;

	try {
		const order = await prisma.saleOrder.findUnique({
			where: { id },
			include: { SaleOrderItem: true },
		});

		if (!order) {
			return NextResponse.json({ error: "Sale order not found" }, { status: 404 });
		}

		return NextResponse.json({ data: order });
	} catch (error) {
		return handleSaleOrderApiError(error, "Failed to fetch sale order");
	}
}

export async function PATCH(request: Request, context: { params: RouteParams }) {
	const { id } = await context.params;

	try {
		const body = await request.json();
		const payload = saleOrderUpdateSchema.parse(body);

		if (Object.keys(payload).length === 0) {
			return NextResponse.json({ error: "No fields provided for update" }, { status: 400 });
		}

		const data = buildSaleOrderData(payload);
		const items = payload.items ? normalizeSaleItems(payload.items) : undefined;

		if (payload.items && items && items.length === 0) {
			return NextResponse.json({ error: "Updated order must include at least one item" }, { status: 400 });
		}

		const order = await prisma.$transaction(async (tx) => {
			if (items) {
				await tx.saleOrderItem.deleteMany({ where: { saleOrderId: id } });
			}

			return tx.saleOrder.update({
				where: { id },
				data: {
					...Object.fromEntries(
						Object.entries(data).filter(([, value]) => value !== undefined)
					),
					...(items
						? {
							SaleOrderItem: {
								create: items,
							},
						}
						: {}),
				},
				include: { SaleOrderItem: true },
			});
		});

		return NextResponse.json({ data: order });
	} catch (error) {
		return handleSaleOrderApiError(error, "Failed to update sale order");
	}
}

export async function DELETE(_request: Request, context: { params: RouteParams }) {
	const { id } = await context.params;

	try {
		// Restore shares to user's portfolio when deleting/cancelling sale order
		await prisma.$transaction(async (tx) => {
			// Get the sale order with items
			const saleOrder = await tx.saleOrder.findUnique({
				where: { id },
				include: { SaleOrderItem: true }
			});

			if (!saleOrder) {
				throw new Error("Sale order not found");
			}

			// Restore shares for each item
			for (const item of saleOrder.SaleOrderItem) {
				const portfolio = await tx.portfolio.findFirst({
					where: {
						userId: saleOrder.userId,
						Company: { name: item.security }
					}
				});

				if (portfolio) {
					// Add shares back to portfolio
					await tx.portfolio.update({
						where: { id: portfolio.id },
						data: { quantity: { increment: item.quantity } }
					});
				}
			}

			// Delete the sale order
			await tx.saleOrder.delete({ where: { id } });
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		return handleSaleOrderApiError(error, "Failed to delete sale order");
	}
}
