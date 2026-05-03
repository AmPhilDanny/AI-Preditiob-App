
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const scrapedCount = await prisma.scrapedData.count();
  const processedCount = await prisma.processedData.count();
  const latestScraped = await prisma.scrapedData.findFirst({ orderBy: { createdAt: 'desc' } });
  const latestProcessed = await prisma.processedData.findFirst({ orderBy: { createdAt: 'desc' } });
  
  const recentScraped = await prisma.scrapedData.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    }
  });

  console.log('--- DB STATUS ---');
  console.log('Total Scraped Records:', scrapedCount);
  console.log('Total Processed Records:', processedCount);
  console.log('Recent Scraped (3 days):', recentScraped);
  console.log('Latest Scraped Time:', latestScraped ? latestScraped.createdAt : 'None');
  console.log('Latest Processed Time:', latestProcessed ? latestProcessed.createdAt : 'None');
  
  if (latestProcessed) {
      console.log('Latest Processed Summary snippet:', latestProcessed.summary.substring(0, 100));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
