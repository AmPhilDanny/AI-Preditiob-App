const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latest = await prisma.scrapedData.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log('--- Latest Scraped Data ---');
  console.log(JSON.stringify(latest, null, 2));
  
  const oldest = await prisma.scrapedData.findFirst({
    orderBy: { createdAt: 'asc' }
  });
  console.log('\n--- Oldest Scraped Data ---');
  console.log(JSON.stringify(oldest, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
