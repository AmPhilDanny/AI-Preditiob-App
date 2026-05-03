
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Testing connection...');
  try {
    const result = await prisma.$runCommandRaw({ ping: 1 });
    console.log('Ping result:', result);
  } catch (e) {
    console.error('Ping failed:', e);
  }
}
main().finally(() => prisma.$disconnect());
