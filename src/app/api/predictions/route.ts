import { NextResponse } from 'next/server';
export const maxDuration = 60; // Extend timeout to 60s for AI processing
import { AnalystAgent } from '@/lib/agents/analyst';
import { HealthAgent } from '@/lib/agents/health';
import { configService } from '@/lib/services/config';
import { AIConfig } from '@/lib/ai/provider';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetStr = searchParams.get('targets');
  const chatContext = searchParams.get('chatContext') || undefined;
  const targets = targetStr ? targetStr.split(',').map(t => isNaN(Number(t)) ? t : Number(t)) : ['SCENARIO_A', 'SCENARIO_B'];

  const config = await configService.getConfig();

  // ── Primary provider selection ──────────────────────────────────────────
  let provider: 'gemini' | 'grok' | 'mistral' | 'openrouter' = 'gemini';
  let apiKey = '';
  let model = 'gemini-2.0-flash';

  if (config.aiProviders.gemini.enabled && config.aiProviders.gemini.apiKey) {
    provider = 'gemini';
    apiKey = config.aiProviders.gemini.apiKey;
    model = config.aiProviders.gemini.model || 'gemini-2.0-flash';
  } else if (config.aiProviders.mistral.enabled && config.aiProviders.mistral.apiKey) {
    provider = 'mistral';
    apiKey = config.aiProviders.mistral.apiKey;
    model = config.aiProviders.mistral.model || 'mistral-large-latest';
  } else if (config.aiProviders.openrouter.enabled && config.aiProviders.openrouter.apiKey) {
    provider = 'openrouter';
    apiKey = config.aiProviders.openrouter.apiKey;
    model = config.aiProviders.openrouter.model || 'google/gemini-2.0-flash-001';
  } else if (config.aiProviders.grok.enabled && config.aiProviders.grok.apiKey) {
    provider = 'grok';
    apiKey = config.aiProviders.grok.apiKey;
    model = 'grok-beta';
  }

  // ── Build Full Fallback Chain ──────────────────────────────────────────
  const allEnabledProviders: Array<{ provider: 'gemini' | 'grok' | 'mistral' | 'openrouter'; apiKey: string; model: string }> = [];
  if (config.aiProviders.gemini.enabled && config.aiProviders.gemini.apiKey) {
    allEnabledProviders.push({ provider: 'gemini', apiKey: config.aiProviders.gemini.apiKey, model: config.aiProviders.gemini.model || 'gemini-2.0-flash' });
  }
  if (config.aiProviders.mistral.enabled && config.aiProviders.mistral.apiKey) {
    allEnabledProviders.push({ provider: 'mistral', apiKey: config.aiProviders.mistral.apiKey, model: config.aiProviders.mistral.model || 'mistral-large-latest' });
  }
  if (config.aiProviders.openrouter.enabled && config.aiProviders.openrouter.apiKey) {
    allEnabledProviders.push({ provider: 'openrouter', apiKey: config.aiProviders.openrouter.apiKey, model: config.aiProviders.openrouter.model || 'google/gemini-2.0-flash-001' });
  }
  if (config.aiProviders.grok.enabled && config.aiProviders.grok.apiKey) {
    allEnabledProviders.push({ provider: 'grok', apiKey: config.aiProviders.grok.apiKey, model: 'grok-beta' });
  }

  // ── Fetch Latest Intelligence Summary ──────────────────────────────────
  const latestIntelligence = await prisma.processedData.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  const aiConfig: AIConfig = {
    provider,
    apiKey,
    model,
    systemPrompt: `STRICT RULE: Focus EXCLUSIVELY on matches occurring TODAY (${new Date().toISOString().split('T')[0]}). 
    
    SYSTEM INTELLIGENCE CONTEXT:
    ${latestIntelligence?.summary || "No prior intelligence found."}
    
    INSTRUCTIONS:
    1. Use the SYSTEM INTELLIGENCE CONTEXT to inform your analysis.
    2. Prioritize accuracy and statistical value.
    3. ${config.agentPrompts.analyst || 'You are an expert football analyst. Predict match outcomes with high confidence.'}`,
    allEnabledProviders
  };


  const analyst = new AnalystAgent(aiConfig);
  const health = new HealthAgent();

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const cachedMatches = await prisma.scrapedData.findMany({
      where: {
        createdAt: {
          gte: startOfToday
        }
      },
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

    // ── Parse Chat Context for overrides ─────────────────────────────────────
    const options: Record<number, { maxMatches?: number; preferredMarket?: string }> = {};
    if (chatContext) {
      const lowerContext = chatContext.toLowerCase();
      
      // Match Count Parsing (e.g. "two matches", "3 games")
      const numMap: Record<string, number> = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
      const matchCountMatch = lowerContext.match(/(one|two|three|four|five|\d+)\s+(match|game|pick|selection)s?\s+for\s+(the\s+)?free/);
      
      if (matchCountMatch) {
        const val = matchCountMatch[1];
        const count = numMap[val] || parseInt(val, 10);
        if (!isNaN(count)) {
          options[1] = { ...options[1], maxMatches: count };
          console.log(`[API] Chat override detected: ${count} matches for FREE tier`);
        }
      }

      // Market Preference Parsing (e.g. "Focus on GG", "Home Win only")
      if (lowerContext.includes('gg') || lowerContext.includes('btts')) {
        options[1] = { ...options[1], preferredMarket: 'GG' };
      }
    }

    const slips = await analyst.generateSlips(matchData, targets, chatContext, options);
    const systemHealth = await health.checkSystemHealth();
    
    const sessionId = `session_${Date.now()}`;

    const validSlips = slips.filter(s => s.matches && s.matches.length > 0);

    const savedSlips = await Promise.all(validSlips.map(slip => {
      const isFree = typeof slip.targetOdds === 'number' && slip.targetOdds <= 1.1;
      return prisma.predictionSlip.create({
        data: {
          sessionId,
          totalOdds: slip.totalOdds,
          confidence: slip.confidence,
          targetOdds: slip.targetOdds as number,
          category: (slip as any).category || (isFree ? "FREE" : `${slip.targetOdds}x`),
          isPremium: !isFree,
          matches: slip.matches as any
        }
      });
    }));

    return NextResponse.json({
      success: true,
      sessionId,
      slips: savedSlips.map(s => ({
        id: s.id,
        matches: s.matches,
        totalOdds: s.totalOdds,
        confidence: s.confidence,
        targetOdds: s.targetOdds,
        category: s.category,
        isPremium: s.isPremium
      })),
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
