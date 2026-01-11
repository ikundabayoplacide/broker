import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCompany } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(req);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "5");
    const offset = (page - 1) * limit;

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: auth.companyId },
      select: { symbol: true }
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Find the system user for this company
    const companyUser = await prisma.user.findFirst({
      where: { 
        email: `system-${company.symbol.toLowerCase()}@company.internal`,
        role: "CLIENT"
      }
    });

    if (!companyUser) {
      // No system user exists yet, return empty notifications
      return NextResponse.json({ 
        notifications: [], 
        unreadCount: 0, 
        totalPages: 1, 
        currentPage: page,
        totalCount: 0 
      });
    }

    // Get notifications for the company system user
    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: { 
          userId: companyUser.id,
          type: { in: ["COMPANY", "TRADE", "SYSTEM"] }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({
        where: { 
          userId: companyUser.id,
          type: { in: ["COMPANY", "TRADE", "SYSTEM"] }
        },
      })
    ]);

    const unreadCount = await prisma.notification.count({
      where: { 
        userId: companyUser.id, 
        isRead: false,
        type: { in: ["COMPANY", "TRADE", "SYSTEM"] }
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({ 
      notifications, 
      unreadCount, 
      totalPages, 
      currentPage: page,
      totalCount 
    });
  } catch (error) {
    console.error("Error fetching company notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(req);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: auth.companyId },
      select: { symbol: true }
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const companyUser = await prisma.user.findFirst({
      where: { 
        email: `system-${company.symbol.toLowerCase()}@company.internal`,
        role: "CLIENT"
      }
    });

    if (!companyUser) {
      return NextResponse.json({ error: "No notifications found" }, { status: 404 });
    }

    const body = await req.json();
    
    // Check if this is a mark-all-read request
    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: { 
          userId: companyUser.id,
          type: { in: ["COMPANY", "TRADE", "SYSTEM"] }
        },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    // Single notification mark as read
    const { notificationId } = body;
    await prisma.notification.update({
      where: { 
        id: notificationId, 
        userId: companyUser.id 
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking company notification as read:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCompany(req);
    if (!auth || !auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: auth.companyId },
      select: { symbol: true }
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const companyUser = await prisma.user.findFirst({
      where: { 
        email: `system-${company.symbol.toLowerCase()}@company.internal`,
        role: "CLIENT"
      }
    });

    if (!companyUser) {
      return NextResponse.json({ error: "No notifications found" }, { status: 404 });
    }

    const { notificationId } = await req.json();

    await prisma.notification.deleteMany({
      where: { 
        id: notificationId, 
        userId: companyUser.id 
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company notification:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}