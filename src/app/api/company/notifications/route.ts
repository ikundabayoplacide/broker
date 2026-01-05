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

    const [notifications, totalCount] = await Promise.all([
      prisma.companyNotification.findMany({
        where: { companyId: auth.companyId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.companyNotification.count({
        where: { companyId: auth.companyId },
      })
    ]);

    const unreadCount = await prisma.companyNotification.count({
      where: { companyId: auth.companyId, isRead: false },
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

    const body = await req.json();
    
    // Check if this is a mark-all-read request
    if (body.markAllRead) {
      await prisma.companyNotification.updateMany({
        where: { companyId: auth.companyId },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    // Single notification mark as read
    const { notificationId } = body;
    await prisma.companyNotification.update({
      where: { id: notificationId, companyId: auth.companyId },
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

    const { notificationId } = await req.json();

    await prisma.companyNotification.deleteMany({
      where: { id: notificationId, companyId: auth.companyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company notification:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}