import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding system configuration...');

  const config = await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      scrapingUrls: [
        'https://www.bet365.com',
        'https://www.betway.com',
        'https://www.sportybet.com'
      ],
      footballApiKey: '',
      geminiApiKey: '',
      geminiEnabled: true,
      grokApiKey: '',
      grokEnabled: false,
      mistralApiKey: '',
      mistralEnabled: false,
      analystPrompt: "You are an expert football analyst. Your goal is to identify low-risk outcomes and combine them into high-value slips.",
      scraperPrompt: "You are a master data gatherer. Focus on fetching real-time odds and team news."
    }
  });

  console.log('Seed completed successfully:', config);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
