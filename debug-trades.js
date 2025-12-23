const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTrades() {
  try {
    console.log('🔍 Checking trades in database...\n');
    
    // Count total trades
    const totalTrades = await prisma.trade.count();
    console.log(`📊 Total trades in database: ${totalTrades}`);
    
    if (totalTrades > 0) {
      // Get recent trades
      const recentTrades = await prisma.trade.findMany({
        include: {
          Company: {
            select: {
              name: true,
              symbol: true,
            },
          },
          User: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      
      console.log('\n📈 Recent trades:');
      recentTrades.forEach((trade, index) => {
        console.log(`${index + 1}. ${trade.type} ${trade.quantity} shares of ${trade.Company.name} (${trade.Company.symbol})`);
        console.log(`   User: ${trade.User.fullName}`);
        console.log(`   Status: ${trade.status}`);
        console.log(`   Created: ${trade.createdAt}`);
        console.log(`   Amount: ${trade.totalAmount}\n`);
      });
    } else {
      console.log('❌ No trades found in database');
      
      // Check if there are users and companies
      const userCount = await prisma.user.count();
      const companyCount = await prisma.company.count();
      
      console.log(`👥 Users in database: ${userCount}`);
      console.log(`🏢 Companies in database: ${companyCount}`);
      
      if (userCount === 0) {
        console.log('⚠️  No users found - you need users to create trades');
      }
      
      if (companyCount === 0) {
        console.log('⚠️  No companies found - you need companies to trade');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugTrades();