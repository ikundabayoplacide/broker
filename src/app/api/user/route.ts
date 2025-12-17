import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { userCreationSchema } from "@/lib/validations/signupValidation";
import type { Role as PrismaRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const defaultNotificationPreferences = {
  email: true,
  sms: false,
  push: false,
};

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

    if (!requestingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!["SUPER_ADMIN", "ADMIN", "MANAGER", "TELLER"].includes(requestingUser.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const data = await req.json();
    const parsed = userCreationSchema.safeParse(data);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          error: issues[0]?.message ?? "Invalid user data",
          fieldErrors: issues,
        },
        { status: 400 }
      );
    }

    const validated = parsed.data;
    const {
      fullName,
      email,
      phoneCountryCode,
      phone,
      password,
      confirmPassword,
      gender,
      country,
      city,
      idNumber,
      passportPhoto,
      idDocument,
      dateOfBirth,
      occupation,
      investmentExperience,
    } = validated;
    void confirmPassword;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const role = (data.role as PrismaRole) || "CLIENT";
    
    // Role-based creation restrictions
    if (requestingUser.role === "TELLER") {
      if (role !== "CLIENT") {
        return NextResponse.json({ error: "Tellers can only create Client accounts" }, { status: 403 });
      }
    } else if (requestingUser.role === "MANAGER") {
      if (!["TELLER", "CLIENT"].includes(role)) {
        return NextResponse.json({ error: "Managers can only create Teller and Client accounts" }, { status: 403 });
      }
    } else if (requestingUser.role === "ADMIN") {
      if (!["MANAGER", "TELLER", "CLIENT"].includes(role)) {
        return NextResponse.json({ error: "Admins cannot create Super Admin accounts" }, { status: 403 });
      }
    }

    const notificationPreferences = data.notificationPreferences || defaultNotificationPreferences;

    const createData: any = {
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
      notificationPreferences,
    };

    if (idNumber) createData.idNumber = idNumber;
    if (passportPhoto) createData.passportPhoto = passportPhoto;
    if (idDocument) createData.idDocument = idDocument;
    if (dateOfBirth) createData.dateOfBirth = new Date(dateOfBirth);
    if (occupation) createData.occupation = occupation;
    if (investmentExperience) createData.investmentExperience = investmentExperience;

    // Handle branch assignment
    if (data.branchId) {
      createData.branchId = data.branchId;
    } else if (requestingUser.role === "MANAGER" && requestingUser.branchId) {
      createData.branchId = requestingUser.branchId;
    }

    // Handle teller assignment for clients
    if (data.createdById) {
      createData.createdById = data.createdById;
    }

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: createData,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          branchId: true,
          createdAt: true,
        },
      });

      // Update branch employee count if user is assigned to a branch
      if (user.branchId) {
        await tx.branch.update({
          where: { id: user.branchId },
          data: {
            employeeCount: {
              increment: 1
            }
          }
        });
      }

      return user;
    });

    return NextResponse.json({
      message: "User created successfully",
      data: createdUser,
      id: createdUser.id,
      email: createdUser.email,
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

    const userId = authResult.userId || authResult.id;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const branchId = searchParams.get("branchId");

    // Get the requesting user's details
    const requestingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, branchId: true }
    });

    if (!requestingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let whereClause: any = {};

    // Role-based filtering
    if (role) {
      whereClause.role = role;
    }

    // Branch-based filtering
    if (branchId) {
      whereClause.branchId = branchId;
    }

    // Role-based access control
    if (requestingUser.role === "TELLER") {
      // Tellers can only see clients in their branch
      whereClause.branchId = requestingUser.branchId;
      if (!role || role === "CLIENT") {
        whereClause.role = "CLIENT";
      } else {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
      }
    } else if (requestingUser.role === "MANAGER") {
      // Managers can see all users in their branch (tellers and clients)
      if (requestingUser.branchId) {
        whereClause.branchId = requestingUser.branchId;
      } else {
        // If manager doesn't have branchId, find branches they manage
        const managedBranches = await prisma.branch.findMany({
          where: { managerId: requestingUser.id },
          select: { id: true }
        });
        if (managedBranches.length > 0) {
          whereClause.branchId = { in: managedBranches.map(b => b.id) };
        }
      }
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
      orderBy: {
        fullName: "asc"
      }
    });
    return NextResponse.json({
      data: users, // Original format for existing pages
      success: true,
      users // New format for trade page
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}