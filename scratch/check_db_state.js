const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log("Checking ScrapedData...");
  const count = await prisma.scrapedData.count();
  console.log("Total ScrapedData:", count);
  
  const recent = await prisma.scrapedData.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log("Recent 5 records:");
  console.log(JSON.stringify(recent, null, 2));
  
  const processedCount = await prisma.processedData.count();
  console.log("Total ProcessedData:", processedCount);
  
  const recentProcessed = await prisma.processedData.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2
  });
  console.log("Recent 2 processed records:");
  console.log(JSON.stringify(recentProcessed, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
