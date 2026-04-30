import { NextResponse } from 'next/server';
import { configService } from '@/lib/services/config';
import { AIFactory, AIConfig } from '@/lib/ai/provider';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json();
    const config = await configService.getConfig();

    // ── Primary provider: pick first enabled AI ─────────────────────────────
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

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        reply: '⚠️ No AI provider is configured. Please add a Gemini or Mistral API key in the Admin Panel → Vault tab.',
        timestamp: new Date().toISOString()
      });
    }

    // ── Fallback: if Gemini is primary, use Mistral as backup ───────────────
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
      systemPrompt: config.agentPrompts.analyst || "You are an expert football data analyst. Use the provided match data to answer questions about Goal-Goal (GG), Over/Under 2.5, 1X2, and other betting markets. Always be precise and point out high-probability matches.",
      fallbackProvider,
      fallbackApiKey,
      fallbackModel,
    };

    const ai = new AIFactory(aiConfig);

    // ── Fetch today's match context from DB ─────────────────────────────────
    const recentMatches = await prisma.scrapedData.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const context = recentMatches.map(m => {
      return `[${m.league}] ${m.homeTeam} vs ${m.awayTeam} | Odds: H:${(m.odds as any)?.home} D:${(m.odds as any)?.draw} A:${(m.odds as any)?.away} | BTTS:${(m.odds as any)?.btts || 'N/A'} | Over2.5:${(m.odds as any)?.over25 || 'N/A'}`;
    }).join('\n');

    const fullMessage = context.length > 0
      ? `DATABASE CONTEXT — Today's Matches:\n${context}\n\nCONVERSATION HISTORY:\n${history.map((h: any) => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}\n\nUSER QUESTION: ${message}\n\nINSTRUCTIONS:\n1. Use the DATABASE CONTEXT to find relevant matches.\n2. For "GG" / "Goal-Goal" / "BTTS", identify matches with competitive odds or attacking teams.\n3. For "Over/Under 2.5", reference the over25/under25 odds where available.\n4. Be professional. List specific teams. If no matches fit, say so clearly.`
      : `No match data in database yet.\n\nUSER QUESTION: ${message}\n\nPlease let the user know there is no match data available yet, and suggest they run the scraper from the Admin panel.`;

    const response = await ai.process(recentMatches, fullMessage);

    return NextResponse.json({
      success: true,
      reply: response.summary,
      provider: response.usedFallback ? `${provider} (fallback: ${fallbackProvider})` : provider,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Chat Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
