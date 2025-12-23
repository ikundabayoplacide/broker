import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, User_role as Role } from "@prisma/client";
import { companySelect } from "../companySelect";
import { companyUpdateSchema } from "@/lib/validations/companyValidation";
import {
  ForbiddenError,
  UnauthorizedError,
  requireUserManagementRole,
} from "@/utils/_helpers";
import { toDecimalOrUndefined } from "../utils";
import { z } from "zod";

// Helper function to serialize BigInt values to strings
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

type RouteParams = Promise<{ id: string }>;

export async function GET(_request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { id } = await params;

    const company = await prisma.company.findUnique({
      where: { id },
      select: companySelect,
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ data: serializeBigInt(company) });
  } catch (error) {
    console.error("Failed to fetch company", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

const ensureOwnership = async (companyId: string, userId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, createdById: true },
  });

  if (!company) {
    return { company: null, owns: false } as const;
  }

  return {
    company,
    owns: company.createdById === userId,
  } as const;
};

export async function PATCH(request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { id } = await params;
    
    // Check if the request is from a company updating itself
    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Try to authenticate as company or admin/super_admin
    let isCompanySelf = false;
    try {
      const auth = await requireUserManagementRole(request, [
        Role.SUPER_ADMIN,
        Role.ADMIN,
      ]);
      
      if (auth.role === Role.ADMIN && company.createdById !== auth.id) {
        throw new ForbiddenError("You can only modify companies you created");
      }
    } catch (error) {
      // If not admin/super_admin, check if it's the company itself
      const { getAuthenticatedUser } = await import("@/lib/apiAuth");
      const companyAuth = await getAuthenticatedUser(request);
      
      if (!companyAuth || companyAuth.id !== id) {
        throw new ForbiddenError("Insufficient permissions");
      }
      isCompanySelf = true;
    }
    const json = await request.json();
    
    // If company is updating itself, skip validation schema
    const parsed = isCompanySelf ? json : companyUpdateSchema.parse(json);

    const sharePrice = parsed.sharePrice
      ? toDecimalOrUndefined(parsed.sharePrice)
      : undefined;

    const data: Prisma.CompanyUpdateInput = {};

    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.description !== undefined)
      data.description = parsed.description ?? null;
    if (parsed.sector !== undefined) data.sector = parsed.sector ?? null;
    if (sharePrice !== undefined) {
      data.sharePrice = sharePrice;
      // Only initialize closingPrice if it doesn't exist
      const currentCompany = await prisma.company.findUnique({ where: { id }, select: { closingPrice: true } });
      if (!currentCompany?.closingPrice) {
        data.closingPrice = sharePrice;
        data.priceChange = "0.00";
      }
    }
    if (parsed.totalShares !== undefined) data.totalShares = parsed.totalShares ?? null;
    if (parsed.availableShares !== undefined)
      data.availableShares = parsed.availableShares !== null ? Number(parsed.availableShares) : null;

    const updated = await prisma.company.update({
      where: { id },
      data,
      select: companySelect,
    });

    return NextResponse.json({ data: serializeBigInt(updated) });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return NextResponse.json(
        {
          error: issue?.message ?? "Invalid company data",
          errors: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A company with these details already exists" },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message.toLowerCase().includes("decimal")) {
      return NextResponse.json(
        { error: "Share price must be a valid number" },
        { status: 400 }
      );
    }

    console.error("Failed to update company", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { id } = await params;
    const auth = await requireUserManagementRole(request, [
      Role.SUPER_ADMIN,
      Role.ADMIN,
    ]);

    const ownership = await ensureOwnership(id, auth.id);

    if (!ownership.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (auth.role === Role.ADMIN && !ownership.owns) {
      throw new ForbiddenError("You can only remove companies you created");
    }

    await prisma.company.delete({ where: { id } });

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Failed to delete company", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
