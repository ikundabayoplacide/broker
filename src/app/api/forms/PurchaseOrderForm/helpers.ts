import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { randomUUID } from "crypto";

// Define the standing frequency values directly
const standingFrequencyValues = ["ANNUALLY", "WEEKLY", "MONTHLY", "NONE"] as const;
const standingFrequencies = new Set<string>(standingFrequencyValues);

const priceSchema = z
	.union([z.number(), z.string()])
	.optional()
	.transform((value) => {
		if (value === undefined) return null;
		if (typeof value === "number") return value.toString();
		const trimmed = value.trim();
		return trimmed.length === 0 ? null : trimmed;
	})
	.refine((value) => value === null || !Number.isNaN(Number(value)), {
		message: "Price must be a valid number",
	});

const standingFrequencySchema = z
	.enum(["ANNUALLY", "WEEKLY", "MONTHLY", "NONE"])
	.optional()
	.nullable()
	.transform((value) => {
		if (value == null) return null;
		return value;
	});

export const purchaseOrderItemSchema = z.object({
	security: z.string().trim().min(1, "Security is required"),
	quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
	price: priceSchema,
});

export const purchaseOrderFieldsSchema = z.object({
	clientName: z.string().trim().min(1, "Client name is required"),
	csdNumber: z.string().trim().optional().nullable(),
	phone: z.string().trim().min(1, "Phone number is required"),
	email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
	address: z.string().trim().min(1, "Address is required"),
	bestMarketPrice: z.boolean().optional(),
	priceLimit: z.boolean().optional(),
	standingOrderNote: z.string().trim().optional().nullable(),
	standingFrequency: standingFrequencySchema,
	additionalInstructions: z.string().trim().optional().nullable(),
});

export const purchaseOrderCreateSchema = purchaseOrderFieldsSchema.extend({
	termsAccepted: z.boolean().refine((value) => value === true, {
		message: "Terms must be accepted",
	}),
	items: z.array(purchaseOrderItemSchema).min(1, "At least one order item is required"),
});

export const purchaseOrderUpdateSchema = purchaseOrderFieldsSchema.extend({
	termsAccepted: z.boolean().optional(),
	items: z.array(purchaseOrderItemSchema).optional(),
}).partial();

export type PurchaseOrderCreateInput = z.infer<typeof purchaseOrderCreateSchema>;
export type PurchaseOrderUpdateInput = z.infer<typeof purchaseOrderUpdateSchema>;

export function toNullableString(value: string | null | undefined) {
	if (value == null) return null;
	const trimmed = value.trim();
	return trimmed.length === 0 ? null : trimmed;
}

export function normalizePurchaseItems(items: Array<z.infer<typeof purchaseOrderItemSchema>>) {
	return items
		.map((item) => ({
			security: item.security.trim(),
			quantity: item.quantity,
			price: item.price,
		}))
		.filter((item) => item.security.length > 0 && item.quantity > 0)
		.map((item) => ({
			id: randomUUID(),
			security: item.security,
			quantity: item.quantity,
			...(item.price !== null ? { price: new Prisma.Decimal(item.price) } : {}),
		}));
}

export function buildPurchaseOrderData(
	payload: PurchaseOrderCreateInput | PurchaseOrderUpdateInput
) {
	return {
		clientName: payload.clientName ? payload.clientName.trim() : undefined,
		csdNumber: payload.csdNumber !== undefined ? toNullableString(payload.csdNumber) : undefined,
		phone: payload.phone ? payload.phone.trim() : undefined,
		email: payload.email ? payload.email.trim().toLowerCase() : undefined,
		address: payload.address ? payload.address.trim() : undefined,
		bestMarketPrice: payload.bestMarketPrice ?? undefined,
		priceLimit: payload.priceLimit ?? undefined,
		standingOrderNote:
			payload.standingOrderNote !== undefined
				? toNullableString(payload.standingOrderNote)
				: undefined,
		standingFrequency:
			payload.standingFrequency !== undefined ? payload.standingFrequency : undefined,
		additionalInstructions:
			payload.additionalInstructions !== undefined
				? toNullableString(payload.additionalInstructions)
				: undefined,
		termsAccepted: "termsAccepted" in payload ? payload.termsAccepted ?? false : undefined,
	};
}

export function handlePurchaseOrderApiError(error: unknown, fallbackMessage: string) {
	if (error instanceof z.ZodError) {
		return NextResponse.json(
			{
				error: "Invalid request data",
				issues: error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				})),
			},
			{ status: 400 }
		);
	}

	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2025") {
			return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
		}
		if (error.code === "P2002") {
			return NextResponse.json(
				{ error: "A purchase order with these details already exists" },
				{ status: 409 }
			);
		}
	}

	console.error(fallbackMessage, error);
	return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
