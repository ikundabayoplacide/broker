import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const rseCompanies = [
  { symbol: 'MTNR', name: 'MTN Rwanda', csdNumber: 'CSD-MTN-001', sharePrice: 115, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'EQTY', name: 'Equity Group', csdNumber: 'CSD-EQTY-001', sharePrice: 500, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'KCB', name: 'KCB Group', csdNumber: 'CSD-KCB-001', sharePrice: 500, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'BOK', name: 'BK Group', csdNumber: 'CSD-BOK-001', sharePrice: 338, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'BK', name: 'BK Group PLC', csdNumber: 'CSD-BK-002', sharePrice: 338, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'USL', name: 'Uchumi Supermarkets', csdNumber: 'CSD-USL-001', sharePrice: 104, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'NMG', name: 'Nation Media Group', csdNumber: 'CSD-NMG-001', sharePrice: 1200, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'RHB', name: 'Rwanda Housing Bank', csdNumber: 'CSD-RHB-001', sharePrice: 526, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'CMR', name: 'Crystal Telecom', csdNumber: 'CSD-CMR-001', sharePrice: 153, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'IMR', name: 'I&M Bank Rwanda', csdNumber: 'CSD-IMR-001', sharePrice: 70, totalShares: 10000000, availableShares: 5000000 },
  { symbol: 'BLR', name: 'Bralirwa', csdNumber: 'CSD-BLR-001', sharePrice: 332, totalShares: 10000000, availableShares: 5000000 },
];

async function main() {
  for (const company of rseCompanies) {
    try {
      const existing = await prisma.company.findFirst({
        where: {
          OR: [
            { symbol: company.symbol },
            { csdNumber: company.csdNumber },
            { name: company.name },
          ],
        },
      });

      if (existing) {
        console.log(`Updating ${company.symbol}...`);
        await prisma.company.update({
          where: { id: existing.id },
          data: {
            symbol: company.symbol,
            name: company.name,
            sharePrice: company.sharePrice,
            closingPrice: company.sharePrice,
            previousClosingPrice: company.sharePrice,
            totalShares: BigInt(company.totalShares),
            availableShares: BigInt(company.availableShares),
            updatedAt: new Date(),
          }
        });
      } else {
        console.log(`Creating ${company.symbol}...`);
        await prisma.company.create({
          data: {
            id: uuidv4(),
            name: company.name,
            email: `${company.symbol.toLowerCase()}@rse.rw`,
            phoneCountryCode: '+250',
            phone: '788000000',
            password: '$2a$10$dummy.hash.for.rse.companies',
            csdNumber: company.csdNumber,
            symbol: company.symbol,
            country: 'Rwanda',
            city: 'Kigali',
            sector: 'Finance',
            sharePrice: company.sharePrice,
            closingPrice: company.sharePrice,
            previousClosingPrice: company.sharePrice,
            priceChange: '0.00',
            totalShares: BigInt(company.totalShares),
            availableShares: BigInt(company.availableShares),
            tradedVolume: 0,
            tradedValue: 0,
            isVerified: true,
            updatedAt: new Date(),
          }
        });
      }
    } catch (error) {
      console.error(`Error with ${company.symbol}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log('✅ Done!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
