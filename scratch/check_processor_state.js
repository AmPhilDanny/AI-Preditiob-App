const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.systemConfig.findFirst();
  console.log('--- Configuration ---');
  console.log(JSON.stringify(config, null, 2));

  const scrapedCount = await prisma.scrapedData.count();
  console.log('\n--- Data Counts ---');
  console.log(`Scraped Data: ${scrapedCount}`);

  const processedCount = await prisma.processedData.count();
  console.log(`Processed Data: ${processedCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
