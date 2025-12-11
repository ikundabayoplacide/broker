import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
	ForbiddenError,
	UnauthorizedError,
	requireUserManagementRole,
	USER_MANAGEMENT_ROLES,
} from "@/utils/_helpers";
import { userCreationSchema, type UserCreationPayload } from "@/lib/validations/signupValidation";
import { ensureCsdNumberAssignment } from "@/lib/csdNumber";

type RoleValue = (typeof USER_MANAGEMENT_ROLES)[number];

const isPrismaKnownError = (error: unknown): error is { code: string } => {
	return typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: unknown }).code === "string";
};

const userSelect = {
	id: true,
	fullName: true,
	email: true,
	phoneCountryCode: true,
	phone: true,
	idNumber: true,
	csdNumber: true,
	passportPhoto: true,
	idDocument: true,
	dateOfBirth: true,
	gender: true,
	country: true,
	city: true,
	occupation: true,
	investmentExperience: true,
	notificationPreferences: true,
	role: true,
	isVerified: true,
	createdBy: {
		select: {
			id: true,
			fullName: true,
			email: true,
			role: true,
		},
	},
	otp: false,
	otpExpiresAt: false,
	createdAt: true,
	updatedAt: true,
} as const;

const ALL_ROLES = [...USER_MANAGEMENT_ROLES] as [RoleValue, ...RoleValue[]];
const MANAGEMENT_ROLES = ["SUPER_ADMIN", "ADMIN", "TELLER"] as const;

const adminCreateExtrasSchema = z.object({
	notificationPreferences: z.any().optional(),
	role: z.enum(ALL_ROLES).optional(),
	isVerified: z.boolean().optional(),
});

type UserResponse = {
	id: string;
	fullName: string;
	email: string;
	phoneCountryCode: string;
	phone: string;
	idNumber: string | null;
	csdNumber: string | null;
	passportPhoto: string | null;
	idDocument: string | null;
	dateOfBirth: Date | null;
	gender: string;
	country: string;
	city: string;
	occupation: string | null;
	investmentExperience: string | null;
	notificationPreferences: unknown;
	role: RoleValue;
	isVerified: boolean;
	createdBy: {
		id: string;
		fullName: string;
		email: string;
		role: RoleValue;
	} | null;
	createdAt: Date;
	updatedAt: Date;
};

function handleError(error: unknown, fallbackMessage: string) {
	if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
		return NextResponse.json({ error: error.message }, { status: error.status });
	}

	if (error instanceof z.ZodError) {
		const issues = error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
		}));

		return NextResponse.json(
			{
				error: issues[0]?.message ?? "Invalid input data",
				errors: issues,
			},
			{ status: 400 }
		);
	}

	if (isPrismaKnownError(error) && error.code === "P2002") {
		return NextResponse.json({ error: "A user with the provided unique field already exists" }, { status: 409 });
	}

	console.error(fallbackMessage, error);
	return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(request: Request) {
	try {
		const auth = await requireUserManagementRole(request, MANAGEMENT_ROLES);
		const where =
			auth.role === "TELLER"
				? { role: "CLIENT", createdById: auth.id }
				: auth.role === "ADMIN"
				? { role: { in: ["TELLER", "CLIENT"] } }
				: undefined;
		const users = (await prisma.user.findMany({
			where: where as never,
			select: userSelect as never,
			orderBy: { createdAt: "desc" },
		})) as unknown as UserResponse[];
		return NextResponse.json({ data: users });
	} catch (error) {
		return handleError(error, "Failed to fetch users");
	}
}

export async function POST(request: Request) {
	try {
		const auth = await requireUserManagementRole(request, MANAGEMENT_ROLES);

		const body = await request.json();
		const payloadForValidation = {
			...body,
			confirmPassword: body?.confirmPassword ?? body?.password,
		};

		const parsedBase: UserCreationPayload = userCreationSchema.parse(payloadForValidation);
		const parsedExtras = adminCreateExtrasSchema.parse(body);

		if (auth.role === "TELLER" && parsedExtras.role && parsedExtras.role !== "CLIENT") {
 			throw new ForbiddenError("Tellers can only create client accounts");
 		}

		if (auth.role === "ADMIN" && parsedExtras.role === "SUPER_ADMIN") {
			throw new ForbiddenError("Admins cannot create super admin accounts");
		}

		const {
			fullName,
			email,
			phoneCountryCode,
			phone,
			password,
			confirmPassword,
			idNumber,
			passportPhoto,
			idDocument,
			dateOfBirth,
			gender,
			country,
			city,
			occupation,
			investmentExperience,
		} = parsedBase;
		void confirmPassword;
		const hashedPassword = await bcrypt.hash(password, 10);
		const now = new Date();
		const targetIsVerified = parsedExtras.isVerified ?? true;

		const createData = {
			fullName,
			email,
			phoneCountryCode,
			phone,
			gender: gender.trim().toLowerCase(),
			password: hashedPassword,
			country,
			city,
			csdNumber: null,
			role: parsedExtras.role ?? "CLIENT",
			isVerified: targetIsVerified,
			otp: null,
			otpExpiresAt: null,
			...(parsedExtras.notificationPreferences !== undefined
				? { notificationPreferences: parsedExtras.notificationPreferences }
				: {}),
			...(idNumber ? { idNumber } : {}),
			...(passportPhoto ? { passportPhoto } : {}),
			...(idDocument ? { idDocument } : {}),
			...(occupation ? { occupation } : {}),
			...(investmentExperience ? { investmentExperience } : {}),
			...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
			createdBy:
				auth.role === "TELLER"
					? {
						connect: { id: auth.id },
					  }
					: undefined,
		};

		const newUser = (await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			const created = (await tx.user.create({
				data: createData as never,
				select: userSelect as never,
			})) as unknown as UserResponse;

			if (!targetIsVerified) {
				return created;
			}

			await ensureCsdNumberAssignment(
				tx,
				{
					id: created.id,
					gender: created.gender,
					country: created.country,
					csdNumber: created.csdNumber,
				},
				{ now }
			);

			return (await tx.user.findUnique({
				where: { id: created.id },
				select: userSelect as never,
			})) as unknown as UserResponse;
		})) as unknown as UserResponse;

		return NextResponse.json({ data: newUser }, { status: 201 });
	} catch (error) {
		return handleError(error, "Failed to create user");
	}
}

// implement logic of getting a single user by id in src/app/api/user/route.ts

export async function GETUSER(request: Request, { params }: { params: { userId: string } }) {
	try {
		const auth = await requireUserManagementRole(request, MANAGEMENT_ROLES);
		const { userId } = params;

		const user = (await prisma.user.findUnique({
			where: { id: userId },
			select: userSelect as never,
		})) as unknown as UserResponse | null;

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (auth.role === "TELLER" && user.role !== "CLIENT") {
			return NextResponse.json({ error: "Tellers can only access client accounts" }, { status: 403 });
		}

		return NextResponse.json({ data: user });
	} catch (error) {
		return handleError(error, "Failed to fetch user");
	}
}
