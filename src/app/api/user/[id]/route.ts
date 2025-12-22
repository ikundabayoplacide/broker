import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import { sendOTPEmail } from "@/utils/mailer";
import {
	ForbiddenError,
	UnauthorizedError,
	requireUserManagementRole,
} from "@/utils/_helpers";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import {
	baseSignupSchema,
	normalizePhone,
	validateDateOfBirth,
	validatePasswordConfirmation,
	validatePhoneNumber,
	validateProfileDetails,
} from "@/lib/validations/signupValidation";
import { ensureCsdNumberAssignment } from "@/lib/csdNumber";

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
	createdById: true,
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

const updateUserSchema = baseSignupSchema
	.extend({
		notificationPreferences: z.any().optional(),
		role: z.nativeEnum(Role).optional(),
		isVerified: z.boolean().optional(),
		passportPhoto: z.string().trim().optional(),
		idDocument: z.string().trim().optional(),
		createdById: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
	})
	.partial()
	.superRefine((data, ctx) => {
		const hasAnyField = Object.keys(data).length > 0;
		if (!hasAnyField) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "At least one field must be provided",
			});
		}

		if (data.password !== undefined) {
			if (data.confirmPassword === undefined) {
				ctx.addIssue({
					path: ["confirmPassword"],
					code: z.ZodIssueCode.custom,
					message: "Please confirm the new password",
				});
			} else {
				validatePasswordConfirmation(
					{ password: data.password, confirmPassword: data.confirmPassword },
					ctx
				);
			}
		} else if (data.confirmPassword !== undefined) {
			ctx.addIssue({
				path: ["confirmPassword"],
				code: z.ZodIssueCode.custom,
				message: "Provide a new password when confirming",
			});
		}

		if (data.dateOfBirth !== undefined) {
			validateDateOfBirth({ dateOfBirth: data.dateOfBirth }, ctx);
		}

		const providedPhone = data.phone !== undefined;
		const providedCode = data.phoneCountryCode !== undefined;
		if (providedPhone || providedCode) {
			if (!data.phone || !data.phoneCountryCode) {
				ctx.addIssue({
					path: providedPhone ? ["phoneCountryCode"] : ["phone"],
					code: z.ZodIssueCode.custom,
					message: "Phone number and country code must be provided together",
				});
			} else {
				validatePhoneNumber(
					{ phoneCountryCode: data.phoneCountryCode, phone: data.phone },
					ctx
				);
			}
		}

		validateProfileDetails(data, ctx);
	});

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

	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2025") {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}
		if (error.code === "P2002") {
			return NextResponse.json({ error: "A user with the provided unique field already exists" }, { status: 409 });
		}
	}

	console.error(fallbackMessage, error);
	return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

type RouteParams = Promise<{ id: string }>;

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
	notificationPreferences: Prisma.JsonValue | null;
	role: Role;
	isVerified: boolean;
	createdById: string | null;
	createdBy: {
		id: string;
		fullName: string;
		email: string;
		role: Role;
	} | null;
	createdAt: Date;
	updatedAt: Date;
};

export async function GET(request: Request, context: { params: RouteParams }) {
	try {
		const auth = await getAuthenticatedUser(request as any);
		if (!auth) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await context.params;

		const user = (await prisma.user.findUnique({
			where: { id },
			select: userSelect as unknown as Prisma.UserSelect,
		})) as UserResponse | null;

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Only apply access control for tellers
		if (auth.role === "TELLER") {
			if (user.role !== Role.CLIENT) {
				return NextResponse.json({ error: "Tellers can only access client accounts" }, { status: 403 });
			}

			// Check if this client was created by this teller
			const clientCheck = await prisma.user.findUnique({
				where: { id },
				select: { createdById: true },
			});

			if (!clientCheck || clientCheck.createdById !== (auth.userId || auth.id)) {
				return NextResponse.json({ error: "Tellers can only access their own clients" }, { status: 403 });
			}
		}

		return NextResponse.json({ data: user });
	} catch (error) {
		return handleError(error, "Failed to fetch user");
	}
}

export async function PATCH(request: Request, context: { params: RouteParams }) {
	try {
		const auth = await requireUserManagementRole(request);
		const { id } = await context.params;

		const existing = await prisma.user.findUnique({
			where: { id },
			select: { id: true, role: true, email: true, isVerified: true },
		});

		if (!existing) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (auth.role === Role.TELLER) {
			if (existing.role !== Role.CLIENT) {
				throw new ForbiddenError("Tellers can only modify their own clients");
			}

			const ownsClient = await prisma.user.count({
				where: {
					id,
					role: Role.CLIENT,
					createdById: auth.id,
				} as unknown as Prisma.UserWhereInput,
			});

			if (!ownsClient) {
				throw new ForbiddenError("Tellers can only modify their own clients");
			}
		}

		const body = await request.json();
		const parsed = updateUserSchema.parse(body);
		const { confirmPassword: _confirmPassword, ...rest } = parsed;
		void _confirmPassword;

		if (auth.role === Role.TELLER && rest.role && rest.role !== Role.CLIENT) {
			throw new ForbiddenError("Tellers cannot change client roles");
		}

		if (auth.role === Role.ADMIN) {
			if (existing.role === Role.SUPER_ADMIN && rest.role !== undefined && rest.role !== existing.role) {
				throw new ForbiddenError("Admins cannot change the role of a super admin");
			}

			if (rest.role === Role.SUPER_ADMIN && existing.role !== Role.SUPER_ADMIN) {
				throw new ForbiddenError("Admins cannot assign the super admin role");
			}
		}

		const data: Record<string, unknown> = {};
		let emailChanged = false;
		let generatedOtp: string | null = null;
		let emailTarget: string | null = null;

		if (rest.fullName !== undefined) data.fullName = rest.fullName.trim();
		if (rest.email !== undefined) {
			const normalizedEmail = rest.email.trim().toLowerCase();
			emailChanged = normalizedEmail !== existing.email;
			data.email = normalizedEmail;
			if (emailChanged) {
				generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
				emailTarget = normalizedEmail;
				data.isVerified = false;
				data.otp = generatedOtp;
				data.otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
			}
		}
		if (rest.idNumber !== undefined) data.idNumber = rest.idNumber.trim();
		if (rest.passportPhoto !== undefined) data.passportPhoto = rest.passportPhoto.trim();
		if (rest.idDocument !== undefined) data.idDocument = rest.idDocument.trim();
		if (rest.dateOfBirth !== undefined) data.dateOfBirth = new Date(rest.dateOfBirth);
		if (rest.country !== undefined) data.country = rest.country.trim();
		if (rest.city !== undefined) data.city = rest.city.trim();
		if (rest.gender !== undefined) data.gender = rest.gender.trim().toLowerCase();
		if (rest.occupation !== undefined) data.occupation = rest.occupation.trim();
		if (rest.investmentExperience !== undefined)
			data.investmentExperience = rest.investmentExperience.trim();
		if (rest.notificationPreferences !== undefined)
			data.notificationPreferences = rest.notificationPreferences;
		if (rest.role !== undefined) data.role = rest.role;
		if (rest.isVerified !== undefined) data.isVerified = rest.isVerified;
		if (rest.createdById !== undefined) {
			const targetId = rest.createdById && rest.createdById.length > 0 ? rest.createdById : null;
			data.createdBy = targetId
				? {
					connect: { id: targetId },
				  }
				: { disconnect: true };
		}

		if (rest.phone !== undefined && rest.phoneCountryCode !== undefined) {
			const normalized = normalizePhone(rest.phoneCountryCode.trim(), rest.phone.trim());
			const phoneNumber = parsePhoneNumberFromString(normalized);
			data.phoneCountryCode = rest.phoneCountryCode.trim();
			data.phone = phoneNumber ? phoneNumber.number : normalized;
		}

		if (rest.password !== undefined) {
			data.password = await bcrypt.hash(rest.password, 10);
		}

		const now = new Date();

		const updatedUser = (await prisma.$transaction(async (tx) => {
			const result = (await tx.user.update({
				where: { id },
				data: data as Prisma.UserUpdateInput,
				select: userSelect as unknown as Prisma.UserSelect,
			})) as unknown as UserResponse;

			if (!result.csdNumber && result.isVerified) {
				await ensureCsdNumberAssignment(
					tx,
					{
						id: result.id,
						gender: result.gender,
						country: result.country,
						csdNumber: result.csdNumber,
					},
					{ now }
				);

				return (await tx.user.findUnique({
					where: { id: result.id },
					select: userSelect as unknown as Prisma.UserSelect,
				})) as unknown as UserResponse;
			}

			return result;
		})) as unknown as UserResponse;

		if (emailChanged && emailTarget && generatedOtp) {
			try {
				await sendOTPEmail(emailTarget, generatedOtp);
			} catch (error) {
				console.error("Failed to send verification OTP after email change", error);
			}
		}

		return NextResponse.json({ data: updatedUser, requiresEmailVerification: emailChanged });
	} catch (error) {
		return handleError(error, "Failed to update user");
	}
}

export async function DELETE(request: Request, context: { params: RouteParams }) {
	try {
		const auth = await requireUserManagementRole(request);
		const { id } = await context.params;

		const existing = await prisma.user.findUnique({
			where: { id },
			select: { id: true, role: true },
		});

		if (!existing) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (auth.role === Role.TELLER) {
			if (existing.role !== Role.CLIENT) {
				throw new ForbiddenError("Tellers can only remove their own clients");
			}

			const ownsClient = await prisma.user.count({
				where: {
					id,
					role: Role.CLIENT,
					createdById: auth.id,
				} as unknown as Prisma.UserWhereInput,
			});

			if (!ownsClient) {
				throw new ForbiddenError("Tellers can only remove their own clients");
			}
		}

		if (auth.role === Role.ADMIN && existing.role === Role.SUPER_ADMIN) {
			throw new ForbiddenError("Admins cannot delete super admin accounts");
		}

		await prisma.user.delete({ where: { id } });

		return NextResponse.json({ message: "User deleted successfully" });
	} catch (error) {
		return handleError(error, "Failed to delete user");
	}
}

