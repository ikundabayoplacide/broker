import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authResult.userId || authResult.id;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // Get the requesting user's details
    const requestingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, branchId: true }
    });

    if (!requestingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let whereClause: any = {};

    // Role-based filtering
    if (role) {
      whereClause.role = role;
    }

    // Branch-based filtering for tellers
    if (requestingUser.role === "TELLER") {
      whereClause.branchId = requestingUser.branchId;
      // Tellers can only see clients in their branch
      if (!role || role === "CLIENT") {
        whereClause.role = "CLIENT";
      } else {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
      }
    }

    // Managers can see users in their branch
    if (requestingUser.role === "MANAGER") {
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