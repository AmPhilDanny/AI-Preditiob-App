import { NextResponse } from 'next/server';
import { configService } from '@/lib/services/config';
import { AIFactory, AIConfig } from '@/lib/ai/provider';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json();
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

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        reply: '⚠️ No AI provider is configured. Please add a Gemini, Mistral, or OpenRouter API key in the Admin Panel → Vault tab.',
        timestamp: new Date().toISOString()
      });
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

    const aiConfig: AIConfig = {
      provider,
      apiKey,
      model,
      systemPrompt: (config.agentPrompts.analyst || "You are an expert football data analyst.") + 
        "\n\nSTRICT INSTRUCTIONS:\n" +
        "1. ALWAYS respond in RICH MARKDOWN format.\n" +
        "2. Use tables for match comparisons.\n" +
        "3. Use bold text for team names and key predictions.\n" +
        "4. Use bullet points for reasoning.\n" +
        "5. NEVER return raw JSON or plain unformatted text.\n" +
        "6. If the user asks for Goal-Goal (GG) or Over/Under, provide a clear structured breakdown.\n" +
        "7. DIRECT ANSWER FIRST: Always answer the user's specific question before providing any betting insights.",
      allEnabledProviders
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

    const now = new Date();
    const dateContext = `Current System Date: ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n` +
                        `Current System Time: ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}\n\n`;

    const fullMessage = context.length > 0
      ? `${dateContext}DATABASE CONTEXT — Today's Available Matches:\n${context}\n\n` +
        `USER QUESTION: ${message}\n\n` +
        `INSTRUCTIONS:\n` +
        `1. Direct Answer: First, answer the user's specific question directly. If they ask for the date, use the Current System Date provided above.\n` +
        `2. Match Analysis: Only reference the DATABASE CONTEXT if the user is asking for betting tips, predictions, or match info.\n` +
        `3. Intent Recognition: If the user is just chatting or asking a non-betting question, do not provide a betting slip or match list.\n` +
        `4. If no relevant matches exist for their specific query, state that clearly.`
      : `${dateContext}No match data in database yet.\n\nUSER QUESTION: ${message}\n\nPlease let the user know there is no match data available yet, and suggest they run the scraper from the Admin panel.`;

    const response = await ai.chat(fullMessage, history);

    return NextResponse.json({
      success: true,
      reply: response.text,
      provider: response.usedFallback ? `${provider} (fallback)` : provider,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Chat Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
