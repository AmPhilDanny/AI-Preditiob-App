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

  // ── Primary provider selection ──────────────────────────────────────────
  let provider: 'gemini' | 'grok' | 'mistral' | 'g4f' = 'gemini';
  let apiKey = '';
  let model = 'gemini-2.5-flash';

  if (config.aiProviders.gemini.enabled && config.aiProviders.gemini.apiKey) {
    provider = 'gemini';
    apiKey = config.aiProviders.gemini.apiKey;
    model = config.aiProviders.gemini.model || 'gemini-2.5-flash';
  } else if (config.aiProviders.mistral.enabled && config.aiProviders.mistral.apiKey) {
    provider = 'mistral';
    apiKey = config.aiProviders.mistral.apiKey;
    model = config.aiProviders.mistral.model || 'mistral-large-latest';
  } else if (config.aiProviders.g4f.enabled && config.aiProviders.g4f.apiKey) {
    provider = 'g4f';
    apiKey = config.aiProviders.g4f.apiKey;
    model = config.aiProviders.g4f.model || 'gpt-4';
  }

  // ── Fallback selection (Gemini -> Mistral -> G4F) ────────────────────────
  let fallbackProvider: 'mistral' | 'g4f' | undefined;
  let fallbackApiKey: string | undefined;
  let fallbackModel: string | undefined;

  if (provider === 'gemini') {
    if (config.aiProviders.mistral.enabled && config.aiProviders.mistral.apiKey) {
      fallbackProvider = 'mistral';
      fallbackApiKey = config.aiProviders.mistral.apiKey;
      fallbackModel = config.aiProviders.mistral.model || 'mistral-large-latest';
    } else if (config.aiProviders.g4f.enabled && config.aiProviders.g4f.apiKey) {
      fallbackProvider = 'g4f';
      fallbackApiKey = config.aiProviders.g4f.apiKey;
      fallbackModel = config.aiProviders.g4f.model || 'gpt-4';
    }
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
