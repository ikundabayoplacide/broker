// here we are going to implement edit and delete routes for orders

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/apiAuth';
import { SaleOrder_status, PurchaseOrder_status } from '@prisma/client';

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
        select: { userId: true, id: true, clientName: true }
      });
      
      if (!existingOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      
      if (existingOrder.userId !== auth.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      // First delete all related items
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: actualOrderId }
      });

      const result = await prisma.purchaseOrder.delete({
        where: { id: actualOrderId },
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
