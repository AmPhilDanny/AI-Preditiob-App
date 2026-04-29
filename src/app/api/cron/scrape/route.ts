import { NextResponse } from 'next/server';
import { ScraperAgent } from '@/lib/agents/scraper';

export async function GET() {
  try {
    const scraper = new ScraperAgent();
    // fetchHybridData now runs scraping, saves to DB, and cleans up old data
    const data = await scraper.fetchHybridData();
    
    return NextResponse.json({ success: true, count: data.length });
  } catch (error: any) {
    console.error('Error in scraper cron:', error);
    return NextResponse.json({ error: 'Scraping failed', details: error.message }, { status: 500 });
  }
}
