import { NextResponse } from 'next/server';
import { ScraperAgent } from '@/lib/agents/scraper';
import { AnalystAgent } from '@/lib/agents/analyst';
import { HealthAgent } from '@/lib/agents/health';
import { configService } from '@/lib/services/config';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetStr = searchParams.get('targets');
  const targets = targetStr ? targetStr.split(',').map(Number) : [2, 5, 10];

  const config = await configService.getConfig();
  
  const scraper = new ScraperAgent();
  const analyst = new AnalystAgent({
    provider: 'gemini',
    apiKey: config.aiProviders.gemini.apiKey,
    model: 'gemini-1.5-pro',
    systemPrompt: config.agentPrompts.analyst // Passing the admin-defined prompt
  });
  const health = new HealthAgent();

  try {
    const matches = await scraper.fetchHybridData();
    const slips = await analyst.generateSlips(matches, targets);
    const systemHealth = await health.checkSystemHealth();

    return NextResponse.json({
      success: true,
      slips,
      health: systemHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Pipeline error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
