import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";
import { companyCreateSchema } from "@/lib/validations/companyValidation";
import { ForbiddenError, UnauthorizedError, requireUserManagementRole } from "@/utils/_helpers";
import { z } from "zod";
import { companySelect } from "./companySelect";
import { toDecimalOrUndefined } from "./utils";
import { generateCompanyCsdNumber } from "@/lib/csdNumber";
import bcrypt from "bcryptjs";

// Helper function to serialize BigInt values to strings
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    const where: Prisma.CompanyWhereInput | undefined = query
      ? {
          OR: [
            { name: { contains: query } },
            { sector: { contains: query } },
          ],
        }
      : undefined;

    const companies = await prisma.company.findMany({
      where,
      select: companySelect,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: serializeBigInt(companies) });
  } catch (error) {
    console.error("Failed to fetch companies", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUserManagementRole(request, [Role.SUPER_ADMIN, Role.ADMIN]);

    const json = await request.json();
    const parsed = companyCreateSchema.parse(json);

    // Hash password
    const hashedPassword = await bcrypt.hash(parsed.password, 10);

    const sharePrice = toDecimalOrUndefined(parsed.sharePrice);

    const company = await prisma.$transaction(async (tx) => {
      // Generate CSD Number for company
      const csdNumber = await generateCompanyCsdNumber(tx, parsed.country);

      // Create company with all credentials
      const newCompany = await tx.company.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          phoneCountryCode: parsed.phoneCountryCode,
          phone: parsed.phone,
          password: hashedPassword,
          csdNumber,
          symbol: parsed.symbol?.trim() || null,
          description: parsed.description ?? null,
          sector: parsed.sector ?? null,
          country: parsed.country,
          city: parsed.city,
          documents: parsed.documents ? JSON.parse(JSON.stringify(parsed.documents)) : Prisma.JsonNull,
          sharePrice,
          totalShares: parsed.totalShares !== undefined ? parsed.totalShares : null,
          availableShares: parsed.availableShares !== undefined ? parsed.availableShares : null,
          closingPrice: sharePrice, // Initialize with sharePrice
          previousClosingPrice: sharePrice, // Initialize with sharePrice
          priceChange: "0.00", // Initialize to 0
          tradedVolume: 0, // Initialize to 0
          tradedValue: 0, // Initialize to 0
          contract: parsed.contract?.trim() || null,
          createdById: auth.id,
        },
        select: companySelect,
      });

      // Create wallet for company
      await tx.companyWallet.create({
        data: {
          companyId: newCompany.id,
          balance: 0,
          lockedBalance: 0,
        },
      });

      // Create a notification for all admins / super-admins to inform them of the new company
      try {
        const recipients = await tx.user.findMany({
          where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
          select: { id: true },
        });

        if (recipients.length > 0) {
          // Create notifications in batch to avoid duplicates
          const notificationData = recipients.map(recipient => ({
            userId: recipient.id,
            title: "New company created",
            message: `Company ${newCompany.name} was created`,
            type: "INFO",
            metadata: { companyId: newCompany.id, event: "company_created" },
          }));

          // Check for existing notifications to prevent duplicates
          const existingNotifications = await tx.notification.findMany({
            where: {
              userId: { in: recipients.map(r => r.id) },
              title: "New company created",
              message: `Company ${newCompany.name} was created`,
            },
          });

          if (existingNotifications.length === 0) {
            await tx.notification.createMany({
              data: notificationData,
            });
          }
        }
      } catch (notifyErr) {
        console.error("Failed to create company notifications:", notifyErr);
      }

      return newCompany;
    });

    return NextResponse.json({ data: serializeBigInt(company) }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A company with this email, phone, or name already exists" }, { status: 409 });
    }

    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return NextResponse.json({
        error: issue?.message ?? "Invalid company data",
        errors: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      }, { status: 400 });
    }

    if (error instanceof Error && error.message.toLowerCase().includes("decimal")) {
      return NextResponse.json({ error: "Share price must be a valid number" }, { status: 400 });
    }

    console.error("Failed to create company", error);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}


