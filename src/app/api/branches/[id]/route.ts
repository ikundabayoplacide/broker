import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {z} from "zod";
import {branchValidationSchema, branchUpdateSchema} from "@/lib/validations/branchValidation";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    console.log("=== BRANCH UPDATE DEBUG ===");
    console.log("Branch ID:", id);
    console.log("Request body:", JSON.stringify(body, null, 2));
    
    if (!id) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    const result = await (prisma as any).$transaction(async (tx: any) => {
      // Get current branch to access manager
      const currentBranch = await tx.branch.findUnique({
        where: { id },
        include: { manager: true }
      });

      console.log("Current branch:", JSON.stringify(currentBranch, null, 2));

      if (!currentBranch) {
        throw new Error("Branch not found");
      }

      // Update manager if manager data is provided
      const hasManagerData = body.managerName || body.managerEmail || body.managerPhone || body.managerCountryCode;
      console.log("Has manager data to update:", hasManagerData);
      console.log("Manager fields:", {
        managerName: body.managerName,
        managerEmail: body.managerEmail,
        managerPhone: body.managerPhone,
        managerCountryCode: body.managerCountryCode
      });

      if (hasManagerData) {
        const managerUpdateData: any = {};
        if (body.managerName) managerUpdateData.fullName = body.managerName;
        if (body.managerEmail) managerUpdateData.email = body.managerEmail;
        if (body.managerPhone) managerUpdateData.phone = body.managerPhone;
        if (body.managerCountryCode) managerUpdateData.phoneCountryCode = body.managerCountryCode;

        console.log("Manager update data:", JSON.stringify(managerUpdateData, null, 2));
        console.log("Current branch managerId:", currentBranch.managerId);

        if (currentBranch.managerId && Object.keys(managerUpdateData).length > 0) {
          console.log("Updating manager with ID:", currentBranch.managerId);
          const updatedManager = await tx.user.update({
            where: { id: currentBranch.managerId },
            data: managerUpdateData
          });
          console.log("Manager updated successfully:", JSON.stringify(updatedManager, null, 2));
        } else {
          console.log("Skipping manager update - no managerId or no update data");
        }
      }

      // Update branch data
      const branchUpdateData: any = {};
      if (body.name) branchUpdateData.name = body.name;
      if (body.location) {
        branchUpdateData.address = body.location;
        branchUpdateData.city = body.location;
      }
      if (body.phone) branchUpdateData.phone = body.phone;
      if (body.email) branchUpdateData.email = body.email;
      if (body.startTime) branchUpdateData.startTime = body.startTime;
      if (body.endTime) branchUpdateData.endTime = body.endTime;

      console.log("Branch update data:", JSON.stringify(branchUpdateData, null, 2));

      const branch = await tx.branch.update({
        where: { id },
        data: branchUpdateData,
        include: {
          manager: { select: { id: true, fullName: true, email: true, phone: true, phoneCountryCode: true } }
        }
      });

      console.log("Final updated branch:", JSON.stringify(branch, null, 2));
      return branch;
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("PUT branch error:", error);
    return NextResponse.json({ 
      error: "Failed to update branch", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    await (prisma as any).branch.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: "Branch deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete branch" }, { status: 500 });
  }
}