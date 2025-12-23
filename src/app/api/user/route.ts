// amazonq-ignore-file typescript-code-quality-error-handling
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { userCreationSchema } from "@/lib/validations/signupValidation";
import bcrypt from "bcryptjs";

type PrismaRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TELLER" | "CLIENT";

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(req);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestingUser = await prisma.user.findUnique({
      where: { id: authResult.userId || authResult.id },
      select: { role: true, branchId: true }
    });

    if (!requestingUser || !["SUPER_ADMIN", "ADMIN", "MANAGER", "TELLER"].includes(requestingUser.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const data = await req.json();
    const parsed = userCreationSchema.safeParse(data);

    if (!parsed.success) {
      return NextResponse.json({
        error: parsed.error.issues[0]?.message ?? "Invalid user data",
        fieldErrors: parsed.error.issues.map(issue => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      }, { status: 400 });
    }

    const validated = parsed.data;
    const { fullName, email, phoneCountryCode, phone, password, gender, country, city, idNumber, passportPhoto, idDocument, dateOfBirth, occupation, investmentExperience } = validated;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const role = (data.role as PrismaRole) || "CLIENT";
    
    // Role-based creation restrictions
    if (requestingUser.role === "TELLER" && role !== "CLIENT") {
      return NextResponse.json({ error: "Tellers can only create Client accounts" }, { status: 403 });
    }
    if (requestingUser.role === "MANAGER" && !["TELLER", "CLIENT"].includes(role)) {
      return NextResponse.json({ error: "Managers can only create Teller and Client accounts" }, { status: 403 });
    }
    if (requestingUser.role === "ADMIN" && !["MANAGER", "TELLER", "CLIENT"].includes(role)) {
      return NextResponse.json({ error: "Admins cannot create Super Admin accounts" }, { status: 403 });
    }

    const createData: any = {
      id: crypto.randomUUID(),
      fullName,
      email,
      phoneCountryCode,
      phone,
      password: hashed,
      gender,
      country,
      city,
      role,
      isVerified: data.isVerified || false,
      notificationPreferences: data.notificationPreferences || { email: true, sms: false, push: false },
      updatedAt: new Date(),
    };

    if (idNumber) createData.idNumber = idNumber;
    if (passportPhoto) createData.passportPhoto = passportPhoto;
    if (idDocument) createData.idDocument = idDocument;
    if (dateOfBirth) createData.dateOfBirth = new Date(dateOfBirth);
    if (occupation) createData.occupation = occupation;
    if (investmentExperience) createData.investmentExperience = investmentExperience;
    if (data.branchId) createData.branchId = data.branchId;
    if (data.createdById) createData.createdById = data.createdById;

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: createData,
        select: { id: true, fullName: true, email: true, role: true, createdAt: true },
      });

      await tx.wallet.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          balance: 0,
          updatedAt: new Date(),
        },
      });

      return user;
    });

    return NextResponse.json({
      message: "User created successfully",
      data: createdUser,
    });
  } catch (err) {
    console.error("Error creating user:", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestingUser = await prisma.user.findUnique({
      where: { id: authResult.userId || authResult.id },
      select: { id: true, role: true, branchId: true }
    });

    if (!requestingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const branchId = searchParams.get("branchId");

    let whereClause: any = {};
    if (role) whereClause.role = role;
    if (branchId) whereClause.branchId = branchId;

    // Role-based access control
    if (requestingUser.role === "TELLER") {
      whereClause.role = "CLIENT";
      whereClause.createdById = requestingUser.id;
    } else if (requestingUser.role === "MANAGER" && requestingUser.branchId) {
      whereClause.branchId = requestingUser.branchId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        email: true,
        csdNumber: true,
        role: true,
        branchId: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { fullName: "asc" }
    });

    return NextResponse.json({ data: users, success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}