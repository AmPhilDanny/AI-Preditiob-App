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
      model: provider === 'gemini' ? 'gemini-1.5-pro' : 'latest',
      systemPrompt: "You are a football data analyst. Use the provided context to answer the user's question about matches, leagues, and odds."
    };

    const ai = new AIFactory(aiConfig);

    // Fetch some context from processed data
    const recentData = await prisma.processedData.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    const context = recentData.map(d => d.summary).join("\n");
    const fullMessage = `Context from recent match processing:\n${context}\n\nUser Question: ${message}`;

    const response = await ai.process({ message }, fullMessage);

    return NextResponse.json({ 
      success: true, 
      reply: response.summary, // AIFactory.process returns a summary in our mock
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Chat Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
