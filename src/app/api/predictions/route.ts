import { NextResponse } from 'next/server';
import { ScraperAgent } from '@/lib/agents/scraper';
import { AnalystAgent } from '@/lib/agents/analyst';
import { HealthAgent } from '@/lib/agents/health';
import { configService } from '@/lib/services/config';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetStr = searchParams.get('targets');
  const targets = targetStr ? targetStr.split(',').map(Number) : [2, 5, 10];

  const config = await configService.getConfig();
  
  const scraper = new ScraperAgent();
  const analyst = new AnalystAgent({
    provider: 'gemini',
    apiKey: config.aiProviders.gemini.apiKey,
    model: 'gemini-2.0-flash-exp',
    systemPrompt: config.agentPrompts.analyst
  });
  const health = new HealthAgent();

  try {
    const matches = await scraper.fetchHybridData();
    const slips = await analyst.generateSlips(matches, targets);
    const systemHealth = await health.checkSystemHealth();

    // Persist slips to database for history tracking
    await Promise.all(slips.map(slip => 
      prisma.predictionSlip.create({
        data: {
          totalOdds: slip.totalOdds,
          confidence: slip.confidence,
          targetOdds: slip.targetOdds,
          matches: slip.matches as any
        }
      })
    ));

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
