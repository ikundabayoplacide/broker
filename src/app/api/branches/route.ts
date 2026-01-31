import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
const db = prisma as any;
import {z} from "zod";
import {branchValidationSchema} from "@/lib/validations/branchValidation";
import bcrypt from "bcryptjs";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestingUser = await db.user.findUnique({
      where: { id: authResult.userId || authResult.id },
      select: { role: true, branchId: true }
    });

    if (!requestingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let whereClause: any = {};
    
    // Managers can only see their own branch
    if (requestingUser.role === "MANAGER" && requestingUser.branchId) {
      whereClause.id = requestingUser.branchId;
    }
    // Tellers can only see their own branch
    else if (requestingUser.role === "TELLER" && requestingUser.branchId) {
      whereClause.id = requestingUser.branchId;
    }
    // SUPER_ADMIN and ADMIN can see all branches (no filter)

    const branches = await db.branch.findMany({
      where: whereClause,
      include: {
        User_Branch_managerIdToUser: { select: { id: true, fullName: true } },
        _count: { select: { User_User_branchIdToBranch: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Map the response to more user-friendly field names
    const formattedBranches = branches.map((branch: any) => ({
      ...branch,
      manager: branch.User_Branch_managerIdToUser,
      employeeCount: branch._count.User_User_branchIdToBranch,
      // Remove the complex relation names from response
      User_Branch_managerIdToUser: undefined,
      _count: undefined
    }));
    
    return NextResponse.json(formattedBranches);
  } catch (error) {
    console.error("GET branches error:", error);
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = branchValidationSchema.parse(body);
    
    const result = await db.$transaction(async (tx: any) => {
      const manager = await tx.user.create({
        data: {
          id: uuidv4(),
          fullName: validatedData.managerName,
          email: validatedData.managerEmail,
          phone: validatedData.managerPhone,
          phoneCountryCode: validatedData.managerCountryCode,
          password: await bcrypt.hash(validatedData.managerPassword, 10),
          role: "MANAGER",
          country: validatedData.country || validatedData.location,
          city: validatedData.location,
          isVerified: true,
          updatedAt: new Date(),
        }
      });
      
      await tx.wallet.create({
        data: {
          id: uuidv4(),
          userId: manager.id,
          balance: 0,
          updatedAt: new Date(),
        }
      });
      
      const branch = await tx.branch.create({
        data: {
          id: uuidv4(),
          name: validatedData.name,
          code: `BR${Date.now()}`,
          address: validatedData.location,
          city: validatedData.location,
          country: validatedData.country,
          phone: validatedData.phone,
          email: validatedData.email,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          managerId: manager.id,
          services: validatedData.services || [],
          updatedAt: new Date(),
        }
      });
      
      await tx.user.update({
        where: { id: manager.id },
        data: { branchId: branch.id }
      });
      
      return { branch, manager };
    }, {
      timeout: 15000 // 15 seconds timeout
    });
    
    // Create notifications outside the transaction to avoid timeout
    try {
      await db.notification.create({
        data: {
          id: uuidv4(),
          userId: result.manager.id,
          title: "Branch Manager Assignment",
          message: `You have been assigned as manager of "${result.branch.name}" branch at ${result.branch.address}. Welcome to your new role!`,
          type: "INFO",
          updatedAt: new Date(),
        }
      });
      
      const superAdmins = await db.user.findMany({
        where: { role: "SUPER_ADMIN" },
        select: { id: true }
      });
      
      for (const admin of superAdmins) {
        await db.notification.create({
          data: {
            id: uuidv4(),
            userId: admin.id,
            title: "New Branch Created",
            message: `A new branch "${result.branch.name}" has been created at ${result.branch.address} with manager ${result.manager.fullName}.`,
            type: "SUCCESS",
            updatedAt: new Date(),
          }
        });
      }
    } catch (notificationError) {
      console.error("Failed to create notifications:", notificationError);
      // Don't fail the whole operation if notifications fail
    }
    
    return NextResponse.json(result.branch, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.issues);
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "Failed to create branch", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
