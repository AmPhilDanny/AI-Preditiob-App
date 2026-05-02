const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.systemConfig.findFirst();
  if (config) {
    await prisma.systemConfig.update({
      where: { id: config.id },
      data: { geminiModel: 'gemini-1.5-flash' }
    });
    console.log('Successfully updated geminiModel to gemini-1.5-flash');
  } else {
    console.log('No configuration found to update.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
