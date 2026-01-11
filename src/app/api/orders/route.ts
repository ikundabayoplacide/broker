// here we are going to implement edit and delete routes for orders

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/apiAuth';
import { SaleOrder_status, PurchaseOrder_status } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request as any);
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { orderType, items, clientName } = await request.json();

    if (!orderType || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'orderType and items array are required' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (orderType === 'SELL') {
        // Create sale order
        const saleOrder = await tx.saleOrder.create({
          data: {
            id: uuidv4(),
            userId: auth.userId!,
            clientName: clientName || 'Self',
            csdNumber: null,
            phone: '',
            email: '',
            address: '',
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Process each item
        for (const item of items) {
          const { security, quantity, price } = item;
          const expectedAmount = Number(quantity) * Number(price);

          // Check if user has enough shares
          const portfolio = await tx.portfolio.findFirst({
            where: {
              userId: auth.userId,
              Company: { name: security }
            }
          });

          if (!portfolio || portfolio.quantity < quantity) {
            throw new Error(`Insufficient shares for ${security}`);
          }

          // Deduct shares from portfolio
          await tx.portfolio.update({
            where: { id: portfolio.id },
            data: { quantity: { decrement: quantity } }
          });

          // Create sale order item
          await tx.saleOrderItem.create({
            data: {
              saleOrderId: saleOrder.id,
              security,
              quantity,
              price,
              expectedAmount: expectedAmount
            } as any
          });
        }

        return { orderId: saleOrder.id, type: 'SELL' };

      } else if (orderType === 'BUY') {
        // Calculate total amount needed
        const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.price)), 0);

        // Check wallet balance
        const wallet = await tx.wallet.findUnique({
          where: { userId: auth.userId }
        });

        if (!wallet || (Number(wallet.balance) - Number(wallet.lockedBalance)) < totalAmount) {
          throw new Error('Insufficient wallet balance');
        }

        // Create purchase order
        const purchaseOrder = await tx.purchaseOrder.create({
          data: {
            id: uuidv4(),
            userId: auth.userId!,
            clientName: clientName || 'Self',
            csdNumber: null,
            phone: '',
            email: '',
            address: '',
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Process each item and lock funds
        for (const item of items) {
          const { security, quantity, price } = item;
          const reservedAmount = Number(quantity) * Number(price);

          // Create purchase order item
          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: purchaseOrder.id,
              security,
              quantity,
              price,
              reservedAmount: reservedAmount
            } as any
          });
        }

        // Lock the total amount in wallet
        await tx.wallet.update({
          where: { userId: auth.userId },
          data: {
            lockedBalance: { increment: totalAmount }
          }
        });

        return { orderId: purchaseOrder.id, type: 'BUY', amountLocked: totalAmount };
      } else {
        throw new Error('Invalid order type');
      }
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request as any);
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { orderId, orderType, status } = await request.json();

    if (!orderId || !orderType) {
      return NextResponse.json(
        { message: 'orderId and orderType are required' },
        { status: 400 }
      );
    }

    // Extract actual order ID by removing prefix and suffix
    const actualOrderId = orderId.replace(/^SO-|^PO-/, '').replace(/-\d+$/, '');
    const updateStatus = status || "PROCESS";

    if (orderType === 'SELL') {
      // Check if user owns this order
      const existingOrder = await prisma.saleOrder.findUnique({
        where: { id: actualOrderId },
        select: { userId: true }
      });
      
      if (!existingOrder || existingOrder.userId !== auth.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const result = await prisma.saleOrder.update({
        where: { id: actualOrderId },
        data: { status: updateStatus as SaleOrder_status, updatedAt: new Date() }
      });
    } else if (orderType === 'BUY') {
      // Check if user owns this order
      const existingOrder = await prisma.purchaseOrder.findUnique({
        where: { id: actualOrderId },
        select: { userId: true }
      });
      
      if (!existingOrder || existingOrder.userId !== auth.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const result = await prisma.purchaseOrder.update({
        where: { id: actualOrderId },
        data: { status: updateStatus as PurchaseOrder_status, updatedAt: new Date() }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request as any);
    
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderType } = body;

    if (!orderId || !orderType) {
      return NextResponse.json(
        { message: 'orderId and orderType are required' },
        { status: 400 }
      );
    }

    // Extract actual order ID by removing prefix and suffix
    const actualOrderId = orderId.replace(/^SO-|^PO-/, '').replace(/-\d+$/, '');

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      return NextResponse.json(
        { error: 'Database connection failed. Please check your database configuration.' },
        { status: 503 }
      );
    }

    if (orderType === 'SELL') {
      // Check if user owns this order
      const existingOrder = await prisma.saleOrder.findUnique({
        where: { id: actualOrderId },
        select: { userId: true, id: true, clientName: true }
      });
      
      if (!existingOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      
      if (existingOrder.userId !== auth.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      // First delete all related items
      await prisma.saleOrderItem.deleteMany({
        where: { saleOrderId: actualOrderId }
      });

      const result = await prisma.saleOrder.delete({
        where: { id: actualOrderId },
      });
      
    } else if (orderType === 'BUY') {
      // Check if user owns this order
      const existingOrder = await prisma.purchaseOrder.findUnique({
        where: { id: actualOrderId },
        include: { PurchaseOrderItem: true }
      });
      
      if (!existingOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      
      if (existingOrder.userId !== auth.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      // Use transaction to delete order and refund wallet
      await prisma.$transaction(async (tx) => {
        // Calculate total reserved amount
        const totalReservedAmount = existingOrder.PurchaseOrderItem.reduce(
          (sum, item) => sum + Number((item as any).reservedAmount || 0),
          0
        );

        // First delete all related items
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: actualOrderId }
        });

        // Delete the order
        await tx.purchaseOrder.delete({
          where: { id: actualOrderId },
        });

        // Refund amount back to balance if any
        if (totalReservedAmount > 0) {
          await tx.wallet.update({
            where: { userId: auth.userId },
            data: {
              balance: { increment: totalReservedAmount }
            }
          });
        }
      });
    } else {
      return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete order', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request as any);
    
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderType, action } = body;

    if (!orderId || !orderType || action !== 'cancel') {
      return NextResponse.json(
        { message: 'orderId, orderType, and action=cancel are required' },
        { status: 400 }
      );
    }

    // Extract actual order ID by removing prefix and suffix
    const actualOrderId = orderId.replace(/^SO-|^PO-/, '').replace(/-\d+$/, '');

    const result = await prisma.$transaction(async (tx) => {
      if (orderType === 'SELL') {
        // Handle sell order cancellation
        const existingOrder = await tx.saleOrder.findUnique({
          where: { id: actualOrderId },
          include: { SaleOrderItem: true }
        });
        
        if (!existingOrder) {
          throw new Error("Order not found");
        }
        
        if (existingOrder.userId !== auth.userId) {
          throw new Error("Unauthorized");
        }

        if (existingOrder.status !== "PENDING") {
          throw new Error("Only pending orders can be cancelled");
        }

        // Return shares to portfolio for each item
        for (const item of existingOrder.SaleOrderItem) {
          const portfolio = await tx.portfolio.findFirst({
            where: {
              userId: auth.userId,
              Company: { name: item.security }
            }
          });

          if (portfolio) {
            await tx.portfolio.update({
              where: { id: portfolio.id },
              data: { quantity: { increment: item.quantity } }
            });
          }
        }

        // Calculate total expected amount for logging
        const totalExpectedAmount = existingOrder.SaleOrderItem.reduce(
          (sum, item) => sum + Number((item as any).expectedAmount || 0),
          0
        );

        // Update order status to REJECTED
        await tx.saleOrder.update({
          where: { id: actualOrderId },
          data: { status: "REJECTED", updatedAt: new Date() }
        });

        return { type: 'SELL', sharesReturned: existingOrder.SaleOrderItem.length, expectedAmount: totalExpectedAmount };
        
      } else if (orderType === 'BUY') {
        // Handle buy order cancellation
        const existingOrder = await tx.purchaseOrder.findUnique({
          where: { id: actualOrderId },
          include: { PurchaseOrderItem: true }
        });
        
        if (!existingOrder) {
          throw new Error("Order not found");
        }
        
        if (existingOrder.userId !== auth.userId) {
          throw new Error("Unauthorized");
        }

        if (existingOrder.status !== "PENDING") {
          throw new Error("Only pending orders can be cancelled");
        }

        // Calculate total reserved amount and return to wallet
        const totalReservedAmount = existingOrder.PurchaseOrderItem.reduce(
          (sum, item) => sum + Number((item as any).reservedAmount || 0),
          0
        );

        if (totalReservedAmount > 0) {
          await tx.wallet.update({
            where: { userId: auth.userId },
            data: {
              balance: { increment: totalReservedAmount }
            }
          });
        }

        // Update order status to REJECTED
        await tx.purchaseOrder.update({
          where: { id: actualOrderId },
          data: { status: "REJECTED", updatedAt: new Date() }
        });

        return { type: 'BUY', amountReturned: totalReservedAmount };
      } else {
        throw new Error("Invalid order type");
      }
    }, {
      timeout: 10000 
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Order cancelled successfully',
      data: result 
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to cancel order', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}   
