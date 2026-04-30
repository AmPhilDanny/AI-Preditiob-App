import { NextResponse } from 'next/server';
import { AnalystAgent } from '@/lib/agents/analyst';
import { HealthAgent } from '@/lib/agents/health';
import { configService } from '@/lib/services/config';
import { AIConfig } from '@/lib/ai/provider';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetStr = searchParams.get('targets');
  const userPrompt = searchParams.get('prompt') || undefined;
  const targets = targetStr ? targetStr.split(',').map(Number) : [2, 5, 10];

  const config = await configService.getConfig();

  // ── Pick primary AI provider from config ───────────────────────────────────
  let provider: 'gemini' | 'grok' | 'mistral' = 'gemini';
  let apiKey = '';
  let model = 'gemini-2.5-flash';

  if (config.aiProviders.gemini.enabled && config.aiProviders.gemini.apiKey) {
    provider = 'gemini';
    apiKey = config.aiProviders.gemini.apiKey;
    model = config.aiProviders.gemini.model || 'gemini-2.5-flash';
  } else if (config.aiProviders.mistral.enabled && config.aiProviders.mistral.apiKey) {
    provider = 'mistral';
    apiKey = config.aiProviders.mistral.apiKey;
    model = 'mistral-large-latest';
  }

  // ── Set Mistral as automatic fallback when Gemini is primary ───────────────
  let fallbackProvider: 'mistral' | undefined;
  let fallbackApiKey: string | undefined;
  let fallbackModel: string | undefined;

  if (provider === 'gemini' && config.aiProviders.mistral.enabled && config.aiProviders.mistral.apiKey) {
    fallbackProvider = 'mistral';
    fallbackApiKey = config.aiProviders.mistral.apiKey;
    fallbackModel = 'mistral-large-latest';
  }

  const aiConfig: AIConfig = {
    provider,
    apiKey,
    model,
    systemPrompt: config.agentPrompts.analyst || 'You are an expert football analyst. Predict match outcomes with high confidence.',
    fallbackProvider,
    fallbackApiKey,
    fallbackModel,
  };

  const analyst = new AnalystAgent(aiConfig);
  const health = new HealthAgent();

  try {
    // Use cached scraped data from DB instead of re-scraping
    const cachedMatches = await prisma.scrapedData.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const matchData = cachedMatches.map(m => ({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      league: m.league,
      odds: m.odds as any,
      apiStats: m.rawStats as any,
      sourceType: 'api' as const
    }));

    const slips = await analyst.generateSlips(matchData, targets, userPrompt);
    const systemHealth = await health.checkSystemHealth();

    // Persist slips to DB for history tracking
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
      provider: aiConfig.provider,
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
