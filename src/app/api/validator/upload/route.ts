import { NextResponse } from 'next/server';
import { configService } from '@/lib/services/config';
import { ValidatorAgent } from '@/lib/agents/validator';
import { AIConfig } from '@/lib/ai/provider';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'File must be an image' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type;

    const config = await configService.getConfig();

    // Build fallback chain like in chat
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
    } else if (config.aiProviders.grok.enabled && config.aiProviders.grok.apiKey) {
      provider = 'grok';
      apiKey = config.aiProviders.grok.apiKey;
      model = 'grok-beta';
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No AI provider is configured. Please add an API key in the Admin Panel.'
      }, { status: 500 });
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
    if (config.aiProviders.grok.enabled && config.aiProviders.grok.apiKey) {
      allEnabledProviders.push({ provider: 'grok', apiKey: config.aiProviders.grok.apiKey, model: 'grok-beta' });
    }

    const aiConfig: AIConfig = {
      provider,
      apiKey,
      model,
      systemPrompt: "You are an expert sports betting analyst.",
      allEnabledProviders
    };

    const validator = new ValidatorAgent();
    const result = await validator.validateTicket(base64Data, mimeType, aiConfig);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Validator Upload Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
