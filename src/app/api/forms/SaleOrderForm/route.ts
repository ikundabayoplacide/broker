import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import {
	buildSaleOrderData,
	handleSaleOrderApiError,
	normalizeSaleItems,
	saleOrderCreateSchema,
} from "./helpers";

export async function GET(request: Request) {
	try {
		const auth = await getAuthenticatedUser(request as any);
		if (!auth?.userId) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		const user = await prisma.user.findUnique({
			where: { id: auth.userId },
			select: { role: true }
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const whereClause = user.role.toUpperCase() === 'CLIENT' 
			? { userId: auth.userId } 
			: {}; 

		const orders = await prisma.saleOrder.findMany({
			where: whereClause,
			orderBy: { createdAt: "desc" },
			include: { SaleOrderItem: true },
		});
		return NextResponse.json({ data: orders });
	} catch (error) {
		return handleSaleOrderApiError(error, "Failed to fetch sale orders");
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
		const payload = saleOrderCreateSchema.parse(body);
		const items = normalizeSaleItems(payload.items);

		if (items.length === 0) {
			return NextResponse.json({ error: "At least one valid order item is required" }, { status: 400 });
		}

		// Use userId from payload if provided, otherwise use authenticated user's ID
		const targetUserId = payload.userId || auth.userId;
		const data = buildSaleOrderData(payload, targetUserId);

		const createData = {
			id: randomUUID(),
			...data,
			termsAccepted: true,
			bestMarketPrice: payload.bestMarketPrice ?? false,
			priceLimit: payload.priceLimit ?? false,
			status: 'PENDING', // Set status to PENDING when order is created
			updatedAt: new Date(),
			SaleOrderItem: {
				create: items,
			},
		};

		const cleanedCreateData = Object.fromEntries(
			Object.entries(createData).filter(([, value]) => value !== undefined)
		) as unknown as Prisma.SaleOrderCreateInput;

		const order = await prisma.$transaction(async (tx) => {
			
			for (const item of items) {
				
				const portfolio = await tx.portfolio.findFirst({
					where: {
						userId: targetUserId,
						Company: { name: item.security }
					}
				});


				if (!portfolio) {
					throw new Error(`No portfolio found for company: ${item.security}`);
				}

				if (portfolio.quantity < item.quantity) {
					throw new Error(`Insufficient shares. Available: ${portfolio.quantity}, Required: ${item.quantity} for ${item.security}`);
				}

				
				// Deduct shares from portfolio
				await tx.portfolio.update({
					where: { id: portfolio.id },
					data: { quantity: { decrement: item.quantity } }
				});
				
			}

			const order = await tx.saleOrder.create({
				data: cleanedCreateData,
				include: { SaleOrderItem: true }
			});
			
			return order;
		}, {
			timeout: 10000 // 10 second timeout
		});

		if (!order) {
			throw new Error("Failed to create sale order");
		}

		return NextResponse.json({ 
			data: order, 
			id: order.id,
			userId: order.userId 
		}, { status: 201 });
	} catch (error) {
		return handleSaleOrderApiError(error, "Failed to create sale order");
	}
}
