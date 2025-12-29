import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only tellers can access this endpoint
    if (user.role !== 'TELLER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Execute queries in parallel but separately to avoid transaction timeout
    const [tradeVolumeResult, executedToday, totalClients, activeClients] = await Promise.all([
      // 1. Trade Volume - Sum of all trades (self + clients) for today
      prisma.trade.aggregate({
        where: {
          OR: [
            { userId: user.userId },
            { 
              User: { 
                createdById: user.userId,
                role: 'CLIENT' 
              } 
            }
          ],
          createdAt: {
            gte: today,
            lt: tomorrow
          },
          status: {
            in: ['EXECUTED', 'PARTIALLY_EXECUTED']
          }
        },
        _sum: {
          totalAmount: true
        }
      }),

      // 2. Executed Today - Count of executed trades
      prisma.trade.count({
        where: {
          OR: [
            { userId: user.userId },
            { 
              User: { 
                createdById: user.userId,
                role: 'CLIENT' 
              } 
            }
          ],
          executedAt: {
            gte: today,
            lt: tomorrow
          },
          status: {
            in: ['EXECUTED', 'PARTIALLY_EXECUTED']
          }
        }
      }),

      // 3. Total Clients - All clients managed by this teller
      prisma.user.count({
        where: {
          createdById: user.userId,
          role: 'CLIENT'
        }
      }),

      // 4. Active Clients - Clients with isVerified = true
      prisma.user.count({
        where: {
          createdById: user.userId,
          role: 'CLIENT',
          isVerified: true
        }
      })
    ]);

    // 5. Commission Calculation (0.5% of trade volume)
    const tradeVolume = tradeVolumeResult._sum.totalAmount || 0;
    const commissionRate = 0.005; // 0.5%
    const commissionEarned = Number(tradeVolume) * commissionRate;

    // Mock data for pending orders (as requested)
    const pendingOrders = 12;

    const stats = {
      totalVolume: tradeVolume.toString(),
      executedToday,
      totalClients,
      activeClients,
      commissionEarned: commissionEarned.toString(),
      pendingOrders // Mock data
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching teller stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}