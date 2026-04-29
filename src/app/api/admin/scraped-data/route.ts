import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const data = await prisma.scrapedData.findMany({
      orderBy: { matchDate: 'desc' },
      take: 50
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching scraped data:', error);
    return NextResponse.json({ error: 'Failed to fetch scraped data' }, { status: 500 });
  }
}
