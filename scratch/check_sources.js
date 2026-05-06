const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const now = new Date();
  const past = new Date();
  past.setHours(past.getHours() - 12);
  const future = new Date();
  future.setDate(future.getDate() + 2);

  console.log(`Checking matches between ${past.toISOString()} and ${future.toISOString()}`);

  const data = await prisma.scrapedData.findMany({
    where: {
      matchDate: {
        gte: past,
        lte: future
      }
    }
  });

  const sources = data.reduce((acc, m) => {
    acc[m.sourceApi] = (acc[m.sourceApi] || 0) + 1;
    return acc;
  }, {});

  console.log('--- Match Counts by Source ---');
  console.log(JSON.stringify(sources, null, 2));

  if (data.length > 0) {
    console.log('\n--- Sample (First 5) ---');
    data.slice(0, 5).forEach(m => {
      console.log(`${m.homeTeam} vs ${m.awayTeam} | Date: ${m.matchDate} | Source: ${m.sourceApi}`);
    });
  } else {
    console.log('No matches found in this window.');
  }

  await prisma.$disconnect();
}

checkData();
