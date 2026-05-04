import { NextResponse } from 'next/server';
import { configService } from '@/lib/services/config';
import { ProcessorAgent } from '@/lib/agents/processor';
import { AIConfig } from '@/lib/ai/provider';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || text.length < 10) {
      return NextResponse.json({ success: false, error: 'Text content too short or missing.' }, { status: 400 });
    }

    const config = await configService.getConfig();

    // Provider selection
    let provider: 'gemini' | 'grok' | 'mistral' | 'openrouter' = 'gemini';
    let apiKey = '';
    let model = 'gemini-1.5-flash';

    if (config.aiProviders.gemini.enabled && config.aiProviders.gemini.apiKey) {
      provider = 'gemini';
      apiKey = config.aiProviders.gemini.apiKey;
      model = config.aiProviders.gemini.model || 'gemini-1.5-flash';
    } else if (config.aiProviders.mistral.enabled && config.aiProviders.mistral.apiKey) {
      provider = 'mistral';
      apiKey = config.aiProviders.mistral.apiKey;
      model = config.aiProviders.mistral.model || 'mistral-large-latest';
    } else if (config.aiProviders.openrouter.enabled && config.aiProviders.openrouter.apiKey) {
      provider = 'openrouter';
      apiKey = config.aiProviders.openrouter.apiKey;
      model = config.aiProviders.openrouter.model || 'google/gemini-2.0-flash-001';
    }

    if (!apiKey) {
      throw new Error('No AI provider configured for processing.');
    }

    const allEnabledProviders: Array<{ provider: 'gemini' | 'grok' | 'mistral' | 'openrouter'; apiKey: string; model: string }> = [];
    if (config.aiProviders.gemini.enabled && config.aiProviders.gemini.apiKey) {
      allEnabledProviders.push({ provider: 'gemini', apiKey: config.aiProviders.gemini.apiKey, model: config.aiProviders.gemini.model || 'gemini-1.5-flash' });
    }
    if (config.aiProviders.mistral.enabled && config.aiProviders.mistral.apiKey) {
      allEnabledProviders.push({ provider: 'mistral', apiKey: config.aiProviders.mistral.apiKey, model: config.aiProviders.mistral.model || 'mistral-large-latest' });
    }
    if (config.aiProviders.openrouter.enabled && config.aiProviders.openrouter.apiKey) {
      allEnabledProviders.push({ provider: 'openrouter', apiKey: config.aiProviders.openrouter.apiKey, model: config.aiProviders.openrouter.model || 'google/gemini-2.0-flash-001' });
    }

    const aiConfig: AIConfig = {
      provider,
      apiKey,
      model,
      systemPrompt: "You are an expert football data processor.",
      allEnabledProviders
    };

    const processor = new ProcessorAgent(aiConfig);
    const result = await processor.importManualData(text);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Manual Import Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
