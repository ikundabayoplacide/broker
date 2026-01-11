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
		console.log('🛒 PURCHASE ORDER - Starting buy share process');
		
		// Get authenticated user
		const auth = await getAuthenticatedUser(request as any);
		if (!auth?.userId) {
			console.log('❌ PURCHASE ORDER - Authentication failed');
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		console.log('✅ PURCHASE ORDER - User authenticated:', auth.userId);

		const body = await request.json();
		console.log('📝 PURCHASE ORDER - Request body:', JSON.stringify(body, null, 2));
		
		const payload = purchaseOrderCreateSchema.parse(body);
		console.log('✅ PURCHASE ORDER - Payload validated');
		
		const items = normalizePurchaseItems(payload.items);
		console.log('📊 PURCHASE ORDER - Normalized items:', items);

		if (items.length === 0) {
			console.log('❌ PURCHASE ORDER - No valid items found');
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

		// Calculate total order amount
		const totalAmount = items.reduce((sum, item) => {
			const price = item.price ? Number(item.price) : 0;
			return sum + (price * item.quantity);
		}, 0);
		
		console.log('💰 PURCHASE ORDER - Total amount calculated:', totalAmount);

		if (totalAmount <= 0) {
			console.log('❌ PURCHASE ORDER - Invalid total amount:', totalAmount);
			return NextResponse.json({ error: "Order total must be greater than 0" }, { status: 400 });
		}

		const data = buildPurchaseOrderData(payload, targetUserId);
		console.log('🏗️ PURCHASE ORDER - Order data built:', data);

		const createData = {
			id: randomUUID(),
			...data,
			termsAccepted: true,
			bestMarketPrice: payload.bestMarketPrice ?? false,
			priceLimit: payload.priceLimit ?? false,
			status: 'PENDING', // Set status to PENDING when order is created
			updatedAt: new Date(),
			PurchaseOrderItem: {
				create: items.map(item => ({
					...item,
					reservedAmount: item.price ? Number(item.price) * item.quantity : 0
				})),
			},
		};

		const cleanedCreateData = Object.fromEntries(
			Object.entries(createData).filter(([, value]) => value !== undefined)
		) as unknown as Prisma.PurchaseOrderCreateInput;
		
		console.log('🧹 PURCHASE ORDER - Cleaned create data prepared');

		// Use transaction to create order and update wallet
		console.log('🔄 PURCHASE ORDER - Starting transaction');
		// Increase interactive transaction timeout to avoid P2028 when DB ops take longer
		const result = await prisma.$transaction(async (tx) => {
			console.log('💳 PURCHASE ORDER - Checking wallet balance for user:', targetUserId);
			
			// Check wallet balance
			const wallet = await tx.wallet.findUnique({
				where: { userId: targetUserId }
			});

			console.log('💳 PURCHASE ORDER - Wallet found:', wallet);

			if (!wallet) {
				console.log('❌ PURCHASE ORDER - Wallet not found for user:', targetUserId);
				throw new Error("Wallet not found");
			}

			const currentBalance = Number(wallet.balance);
			console.log('💰 PURCHASE ORDER - Balance check:', {
				currentBalance,
				requiredAmount: totalAmount,
				hasSufficientFunds: currentBalance >= totalAmount
			});

			if (currentBalance < totalAmount) {
				console.log('❌ PURCHASE ORDER - Insufficient funds');
				throw new Error(`Insufficient funds. Available: ${wallet.balance}, Required: ${totalAmount}`);
			}

			// Create the order
			const order = await tx.purchaseOrder.create({
				data: cleanedCreateData,
				include: { PurchaseOrderItem: true },
			});
			
			console.log('✅ PURCHASE ORDER - Created with status:', order.status);

			console.log('💸 PURCHASE ORDER - Deducting amount from wallet');
			// Deduct amount from wallet balance. Use wallet.id for deterministic update inside transaction.
			const updatedWallet = await tx.wallet.update({
				where: { id: wallet.id },
				data: {
					balance: { decrement: totalAmount }
				}
			});
			
			console.log('✅ PURCHASE ORDER - Wallet updated. New balance:', updatedWallet.balance);

			return order;
		}, {
			timeout: 15000 // 15 second timeout for interactive transaction
		});

		console.log('🎉 PURCHASE ORDER - Transaction completed successfully');
		return NextResponse.json({ 
			data: result, 
			id: result.id,
			userId: result.userId,
			totalAmount,
			message: `Order created successfully. ${totalAmount} deducted from wallet.`
		}, { status: 201 });
	} catch (error) {
		console.log('❌ PURCHASE ORDER - Error occurred:', error);
		return handlePurchaseOrderApiError(error, "Failed to create purchase order");
	}
}
