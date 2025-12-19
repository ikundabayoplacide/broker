import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get today's trading volume
    const todayVolume = await prisma.trade.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'EXECUTED',
      },
    });

    // Get yesterday's trading volume for comparison
    const yesterdayVolume = await prisma.trade.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
        status: 'EXECUTED',
      },
    });

    const todayTotal = Number(todayVolume._sum.totalAmount || 0);
    const yesterdayTotal = Number(yesterdayVolume._sum.totalAmount || 0);
    
    // Calculate percentage change
    const percentageChange = yesterdayTotal > 0 
      ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        todayVolume: todayTotal,
        yesterdayVolume: yesterdayTotal,
        percentageChange: Math.round(percentageChange * 100) / 100, // Round to 2 decimal places
        isPositive: percentageChange >= 0,
      },
    });
  } catch (error) {
    console.error('Error fetching daily trading volume:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily trading volume' },
      { status: 500 }
    );
  }
}