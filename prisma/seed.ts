const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      scrapingUrls: ['https://www.bet365.com', 'https://www.betway.com'],
      analystPrompt: "You are an expert football analyst. Your goal is to identify low-risk outcomes (Wins, Goals, Corners) and combine them into high-value slips that match the target odds requested.",
      scraperPrompt: "You are a master data gatherer. Focus on fetching real-time odds, team news, and market movements.",
      footballApiKey: process.env.FOOTBALL_API_KEY || '',
      geminiApiKey: process.env.GEMINI_API_KEY || ''
    },
  });
  console.log('Seed data created:', config);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
