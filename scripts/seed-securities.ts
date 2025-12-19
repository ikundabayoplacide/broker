import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const securities = [
  {
    name: "Bank of Kigali Group",
    symbol: "BK",
    email: "info@bk.rw",
    phoneCountryCode: "+250",
    phone: "788123000",
    password: "$2a$10$defaultHashedPassword123456789",
    csdNumber: "CSD001",
    description: "Leading commercial bank in Rwanda",
    sector: "Banking",
    country: "Rwanda",
    city: "Kigali",
    sharePrice: 285.00,
    totalShares: BigInt(1000000),
    availableShares: BigInt(500000),
    closingPrice: 285.00,
    previousClosingPrice: 280.00,
    priceChange: "1.79",
    isVerified: true,
  },
  {
    name: "Equity Bank Rwanda",
    symbol: "EBR",
    email: "info@equitybank.rw",
    phoneCountryCode: "+250",
    phone: "788123001",
    password: "$2a$10$defaultHashedPassword123456789",
    csdNumber: "CSD002",
    description: "Pan-African banking group",
    sector: "Banking",
    country: "Rwanda",
    city: "Kigali",
    sharePrice: 42.50,
    totalShares: BigInt(2000000),
    availableShares: BigInt(1000000),
    closingPrice: 42.50,
    previousClosingPrice: 42.00,
    priceChange: "1.19",
    isVerified: true,
  },
  {
    name: "MTN Rwanda",
    symbol: "MTN",
    email: "info@mtn.rw",
    phoneCountryCode: "+250",
    phone: "788123002",
    password: "$2a$10$defaultHashedPassword123456789",
    csdNumber: "CSD003",
    description: "Leading telecommunications company",
    sector: "Telecommunications",
    country: "Rwanda",
    city: "Kigali",
    sharePrice: 28.75,
    totalShares: BigInt(3000000),
    availableShares: BigInt(1500000),
    closingPrice: 28.75,
    previousClosingPrice: 28.50,
    priceChange: "0.88",
    isVerified: true,
  },
  {
    name: "Bralirwa Limited",
    symbol: "BLR",
    email: "info@bralirwa.rw",
    phoneCountryCode: "+250",
    phone: "788123003",
    password: "$2a$10$defaultHashedPassword123456789",
    csdNumber: "CSD004",
    description: "Leading beverage company",
    sector: "Manufacturing",
    country: "Rwanda",
    city: "Kigali",
    sharePrice: 145.00,
    totalShares: BigInt(800000),
    availableShares: BigInt(400000),
    closingPrice: 145.00,
    previousClosingPrice: 143.00,
    priceChange: "1.40",
    isVerified: true,
  },
  {
    name: "I&M Bank Rwanda",
    symbol: "IMB",
    email: "info@imbank.rw",
    phoneCountryCode: "+250",
    phone: "788123004",
    password: "$2a$10$defaultHashedPassword123456789",
    csdNumber: "CSD005",
    description: "Commercial bank offering diverse financial services",
    sector: "Banking",
    country: "Rwanda",
    city: "Kigali",
    sharePrice: 95.00,
    totalShares: BigInt(1200000),
    availableShares: BigInt(600000),
    closingPrice: 95.00,
    previousClosingPrice: 94.00,
    priceChange: "1.06",
    isVerified: true,
  },
];

async function main() {
  console.log('Starting securities seeding...');

  for (const security of securities) {
    const existing = await prisma.company.findFirst({
      where: { symbol: security.symbol },
    });

    if (existing) {
      console.log(`Security ${security.symbol} already exists, skipping...`);
      continue;
    }

    await prisma.company.create({
      data: {
        id: uuidv4(),
        ...security,
      },
    });

    console.log(`Created security: ${security.symbol} - ${security.name}`);
  }

  console.log('Securities seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding securities:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
