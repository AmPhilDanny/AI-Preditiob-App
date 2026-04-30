import { NextResponse } from 'next/server';
import { configService } from '@/lib/services/config';
import { AIFactory, AIConfig } from '@/lib/ai/provider';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json();
    const config = await configService.getConfig();

    // Select AI provider
    let provider: 'gemini' | 'grok' | 'mistral' = 'gemini';
    let apiKey = '';
    if (config.aiProviders.gemini.enabled) { provider = 'gemini'; apiKey = config.aiProviders.gemini.apiKey; }
    else if (config.aiProviders.grok.enabled) { provider = 'grok'; apiKey = config.aiProviders.grok.apiKey; }
    else if (config.aiProviders.mistral.enabled) { provider = 'mistral'; apiKey = config.aiProviders.mistral.apiKey; }

    if (!apiKey) return NextResponse.json({ success: false, error: 'No AI provider enabled' }, { status: 400 });

    const aiConfig: AIConfig = {
      provider,
      apiKey,
      model: provider === 'gemini' ? 'gemini-2.0-flash' : 'latest',
      systemPrompt: config.agentPrompts.analyst || "You are an expert football data analyst. Use the provided match data to answer questions about Goal-Goal (GG), Over/Under 2.5, 1X2, and other betting markets. Always be precise and point out high-probability matches."
    };

    const ai = new AIFactory(aiConfig);

    // Fetch substantial context from recent scraped data
    const recentMatches = await prisma.scrapedData.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const context = recentMatches.map(m => {
      return `[${m.league}] ${m.homeTeam} vs ${m.awayTeam} | Odds: H:${(m.odds as any)?.home} D:${(m.odds as any)?.draw} A:${(m.odds as any)?.away}`;
    }).join("\n");

    const fullMessage = `
DATABASE CONTEXT (Today's Scraped Matches):
${context}

CONVERSATION HISTORY:
${history.map((h: any) => `${h.role.toUpperCase()}: ${h.content}`).join("\n")}

USER QUESTION: ${message}

INSTRUCTIONS:
1. Use the DATABASE CONTEXT to find relevant matches.
2. If the user asks for "GG", "Goal-Goal", or "Both Teams to Score", find matches with competitive odds or high-scoring potential.
3. If the user asks for "Over 2.5" or "Under 2.5", identify matches based on your football knowledge and the provided context.
4. Be professional and concise. If no matches fit, say so.
`;

    const response = await ai.process(recentMatches, fullMessage);

    return NextResponse.json({ 
      success: true, 
      reply: response.summary, 
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Chat Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
