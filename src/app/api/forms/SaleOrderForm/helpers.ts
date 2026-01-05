import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { randomUUID } from "crypto";

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

export const saleOrderItemSchema = z.object({
	security: z.string().trim().min(1, "Security is required"),
	quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
	price: priceSchema,
});

export const saleOrderFieldsSchema = z.object({
	clientName: z.string().trim().min(1, "Client name is required"),
	csdNumber: z.string().trim().optional().nullable(),
	phone: z.string().trim().min(1, "Phone number is required"),
	email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
	address: z.string().trim().min(1, "Address is required"),
	bestMarketPrice: z.boolean().optional(),
	priceLimit: z.boolean().optional(),
	withinTimeLimitNote: z.string().trim().optional().nullable(),
	bankName: z.string().trim().optional().nullable(),
	bankBranch: z.string().trim().optional().nullable(),
	accountNumber: z.string().trim().optional().nullable(),
});

export const saleOrderCreateSchema = saleOrderFieldsSchema.extend({
	termsAccepted: z.boolean().refine((value) => value === true, {
		message: "Terms must be accepted",
	}),
	items: z.array(saleOrderItemSchema).min(1, "At least one order item is required"),
});

export const saleOrderUpdateSchema = saleOrderFieldsSchema.extend({
	termsAccepted: z.boolean().optional(),
	items: z.array(saleOrderItemSchema).optional(),
}).partial();

export type SaleOrderCreateInput = z.infer<typeof saleOrderCreateSchema>;
export type SaleOrderUpdateInput = z.infer<typeof saleOrderUpdateSchema>;

export function toNullableString(value: string | null | undefined) {
	if (value == null) return null;
	const trimmed = value.trim();
	return trimmed.length === 0 ? null : trimmed;
}

export function normalizeSaleItems(items: Array<z.infer<typeof saleOrderItemSchema>>) {
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

export function buildSaleOrderData(
	payload: SaleOrderCreateInput | SaleOrderUpdateInput,
	userId?: string
) {
	return {
		...(userId && { userId }),
		clientName: payload.clientName ? payload.clientName.trim() : undefined,
		csdNumber: payload.csdNumber !== undefined ? toNullableString(payload.csdNumber) : undefined,
		phone: payload.phone ? payload.phone.trim() : undefined,
		email: payload.email ? payload.email.trim().toLowerCase() : undefined,
		address: payload.address ? payload.address.trim() : undefined,
		bestMarketPrice: payload.bestMarketPrice ?? undefined,
		priceLimit: payload.priceLimit ?? undefined,
		withinTimeLimitNote:
			payload.withinTimeLimitNote !== undefined
				? toNullableString(payload.withinTimeLimitNote)
				: undefined,
		bankName: payload.bankName !== undefined ? toNullableString(payload.bankName) : undefined,
		bankBranch: payload.bankBranch !== undefined ? toNullableString(payload.bankBranch) : undefined,
		accountNumber:
			payload.accountNumber !== undefined ? toNullableString(payload.accountNumber) : undefined,
		termsAccepted: "termsAccepted" in payload ? payload.termsAccepted ?? false : undefined,
	};
}

export function handleSaleOrderApiError(error: unknown, fallbackMessage: string) {
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
			return NextResponse.json({ error: "Sale order not found" }, { status: 404 });
		}
		if (error.code === "P2002") {
			return NextResponse.json(
				{ error: "A sale order with these details already exists" },
				{ status: 409 }
			);
		}
	}

	console.error(fallbackMessage, error);
	return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
