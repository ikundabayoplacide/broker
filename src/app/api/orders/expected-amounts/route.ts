import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/apiAuth';

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request as any);
    
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if user is teller or manager
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true }
    });

    if (!user || !["TELLER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // Get all pending sale orders with expected amounts
    const saleOrders = await prisma.saleOrder.findMany({
      where: {
        status: "PENDING"
      },
      include: {
        SaleOrderItem: true,
        User: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // Calculate expected amounts by user
    const expectedAmountsByUser = saleOrders.reduce((acc, order) => {
      const userId = order.userId;
      const userInfo = order.User;
      
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName: userInfo.fullName,
          email: userInfo.email,
          totalExpectedAmount: 0,
          ordersCount: 0
        };
      }

      // Calculate total expected amount for this order
      const orderExpectedAmount = order.SaleOrderItem.reduce((sum, item) => {
        // Use expectedAmount if available, otherwise calculate from quantity * price
        const amount = Number(item.expectedAmount) || (item.quantity * Number(item.price || 0));
        return sum + amount;
      }, 0);

      acc[userId].totalExpectedAmount += orderExpectedAmount;
      acc[userId].ordersCount += 1;

      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(expectedAmountsByUser);
    const totalExpected = result.reduce((sum, user) => sum + user.totalExpectedAmount, 0);

    return NextResponse.json({
      success: true,
      data: {
        userExpectedAmounts: result,
        totalExpectedAmount: totalExpected,
        totalPendingOrders: saleOrders.length
      }
    });
  } catch (error) {
    console.error('Error fetching expected amounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expected amounts' },
      { status: 500 }
    );
  }
}