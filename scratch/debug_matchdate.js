const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const now = new Date();
  console.log('Current system time:', now.toISOString());
  
  const latest = await prisma.scrapedData.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('\n--- LATEST SCRAPED DATA ---');
  latest.forEach(m => {
    console.log(`${m.homeTeam} vs ${m.awayTeam}`);
    console.log(`  - matchDate: ${m.matchDate ? m.matchDate.toISOString() : 'NULL'}`);
    console.log(`  - createdAt: ${m.createdAt.toISOString()}`);
    console.log(`  - source:    ${m.sourceApi}`);
  });
  
  const futureCount = await prisma.scrapedData.count({
    where: {
      matchDate: {
        gte: now
      }
    }
  });
  console.log(`\nMatches where matchDate >= now: ${futureCount}`);

  await prisma.$disconnect();
}

run();
