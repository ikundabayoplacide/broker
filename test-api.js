const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTradeHistoryAPI() {
  try {
    console.log('🔍 Testing trade history API response format...\n');
    
    // Get a sample user ID
    const user = await prisma.user.findFirst({
      where: { role: 'CLIENT' },
      select: { id: true, fullName: true, email: true }
    });
    
    if (!user) {
      console.log('❌ No CLIENT users found');
      return;
    }
    
    console.log(`👤 Testing with user: ${user.fullName} (${user.email})`);
    console.log(`🆔 User ID: ${user.id}\n`);
    
    // Get trades for this user using the same query as the API
    const trades = await prisma.trade.findMany({
      where: { userId: user.id },
      include: {
        Company: {
          select: {
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    console.log(`📊 Found ${trades.length} trades for this user\n`);
    
    if (trades.length > 0) {
      console.log('📈 Sample trade data:');
      trades.forEach((trade, index) => {
        console.log(`${index + 1}. Trade ID: ${trade.id}`);
        console.log(`   Type: ${trade.type}`);
        console.log(`   Status: ${trade.status}`);
        console.log(`   Quantity: ${trade.quantity}`);
        console.log(`   Company: ${trade.Company.name} (${trade.Company.symbol})`);
        console.log(`   Created: ${trade.createdAt}`);
        console.log(`   Total Amount: ${trade.totalAmount}\n`);
      });
      
      // Test the API response format
      const formattedTrades = trades.map(trade => ({
        ...trade,
        company: trade.Company,
      }));
      
      console.log('✅ API Response format test:');
      console.log('Sample formatted trade:', JSON.stringify(formattedTrades[0], null, 2));
    } else {
      console.log('❌ No trades found for this user');
      
      // Check if there are any trades at all
      const totalTrades = await prisma.trade.count();
      console.log(`📊 Total trades in database: ${totalTrades}`);
      
      if (totalTrades > 0) {
        // Get any trade to see the structure
        const anyTrade = await prisma.trade.findFirst({
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
        });
        
        console.log('📈 Sample trade from database:');
        console.log(`   User: ${anyTrade.User.fullName}`);
        console.log(`   Company: ${anyTrade.Company.name}`);
        console.log(`   Type: ${anyTrade.type}`);
        console.log(`   Status: ${anyTrade.status}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testTradeHistoryAPI();