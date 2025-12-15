import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
const db = prisma as any;
import {z} from "zod";
import {branchValidationSchema} from "@/lib/validations/branchValidation";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const branches = await db.branch.findMany({
      include: {
        manager: { select: { id: true, fullName: true, email: true, phone: true, phoneCountryCode: true } },
        _count: { select: { employees: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(branches);
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
          fullName: validatedData.managerName,
          email: validatedData.managerEmail,
          phone: validatedData.managerPhone,
          phoneCountryCode: validatedData.managerCountryCode,
          password: await bcrypt.hash("defaultPassword123", 10),
          role: "ADMIN",
          country: validatedData.country,
          city: validatedData.location,
          isVerified: true
        }
      });
      
      const branch = await tx.branch.create({
        data: {
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
          services: validatedData.services || []
        },
        include: {
          manager: { select: { id: true, fullName: true, email: true } }
        }
      });
      
      await tx.notification.create({
        data: {
          userId: manager.id,
          title: "Branch Manager Assignment",
          message: `You have been assigned as manager of "${branch.name}" branch at ${branch.address}. Welcome to your new role!`,
          type: "INFO"
        }
      });
      
      // Create notifications for all super admins
      const superAdmins = await tx.user.findMany({
        where: { role: "SUPER_ADMIN" },
        select: { id: true }
      });
      
      for (const admin of superAdmins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            title: "New Branch Created",
            message: `A new branch "${branch.name}" has been created at ${branch.address} with manager ${manager.fullName}.`,
            type: "SUCCESS"
          }
        });
      }
      
      return { branch, manager };
    });
    
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
