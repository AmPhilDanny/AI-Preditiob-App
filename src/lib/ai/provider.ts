import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";

export type AIProvider = 'gemini' | 'grok' | 'mistral' | 'openrouter';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  allEnabledProviders?: Array<{ provider: AIProvider; apiKey: string; model: string }>;
}


export interface PredictionResult {
  match: string;
  prediction: string;
  odds: number;
  probability: number;
  reasoning: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Provider helpers
// ──────────────────────────────────────────────────────────────────────────────
async function callGemini(apiKey: string, model: string, parts: any[]): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });
  const result = await geminiModel.generateContent(parts);
  return result.response.text();
}

async function callMistral(apiKey: string, model: string, systemPrompt: string, userContent: string): Promise<string> {
  const client = new Mistral({ apiKey });
  const response = await client.chat.complete({
    model: model || 'mistral-large-latest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
  });
  return response.choices?.[0]?.message?.content as string || '';
}

async function callOpenRouter(apiKey: string, model: string, systemPrompt: string, userContent: string, imageData?: { base64: string; mimeType: string }): Promise<string> {
  
  let contentArray: any[] = [{ type: "text", text: userContent }];
  if (imageData) {
    contentArray.push({
      type: "image_url",
      image_url: {
        url: `data:${imageData.mimeType};base64,${imageData.base64}`
      }
    });
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ai-football-system.vercel.app',
      'X-Title': 'AI Football System'
    },
    body: JSON.stringify({
      model: model || 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentArray }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API Error: ${err}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ──────────────────────────────────────────────────────────────────────────────
// Unified call function — tries provider, throws on error so caller can fallback
// ──────────────────────────────────────────────────────────────────────────────
async function callProvider(
  provider: AIProvider,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  imageData?: { base64: string; mimeType: string }
): Promise<string> {
  if (provider === 'gemini') {
    const parts: any[] = [systemPrompt, userContent];
    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.base64,
          mimeType: imageData.mimeType
        }
      });
    }
    return callGemini(apiKey, model || 'gemini-1.5-flash', parts);
  }
  if (provider === 'mistral') {
    // Note: If using Pixtral, mistral might support image_url similarly. We'll pass text only for basic mistral models or throw.
    if (imageData && (!model || !model.includes('pixtral'))) {
      console.warn('Mistral non-pixtral models do not support images. Ignoring image.');
    }
    return callMistral(apiKey, model || 'mistral-large-latest', systemPrompt, userContent);
  }
  if (provider === 'openrouter') {
    return callOpenRouter(apiKey, model || 'google/gemini-2.0-flash-001', systemPrompt, userContent, imageData);
  }
  throw new Error(`Provider '${provider}' not implemented`);
}

export class AIFactory {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  // ── Unified call with multi-provider fallback chain ───────────────────────
  private async callWithFallback(systemPrompt: string, userContent: string, imageData?: { base64: string; mimeType: string }): Promise<{ text: string; usedFallback: boolean }> {
    // 1. Try the primary provider first
    try {
      const text = await callProvider(
        this.config.provider,
        this.config.apiKey,
        this.config.model,
        systemPrompt,
        userContent,
        imageData
      );
      return { text, usedFallback: false };
    } catch (primaryErr: any) {
      console.warn(`[AI] Primary (${this.config.provider}) failed: ${primaryErr.message}`);

      // 2. Try the chain of other enabled providers
      const fallbacks = this.config.allEnabledProviders?.filter(p => p.provider !== this.config.provider) || [];
      
      if (fallbacks.length === 0) {
        throw primaryErr;
      }

      console.log(`[AI] Primary failed. Attempting fallback chain of ${fallbacks.length} providers...`);

      for (const fallback of fallbacks) {
        try {
          const text = await callProvider(
            fallback.provider,
            fallback.apiKey,
            fallback.model,
            systemPrompt,
            userContent,
            imageData
          );
          console.log(`[AI] Successfully recovered using fallback: ${fallback.provider}`);
          return { text, usedFallback: true };
        } catch (fallbackErr: any) {
          console.error(`[AI] Fallback (${fallback.provider}) also failed: ${fallbackErr.message}`);
          // Continue to next fallback in chain
        }
      }

      throw new Error(`All enabled AI providers failed. Final error: ${primaryErr.message}`);
    }
  }


  // ── Natural Chat (Conversation focused) ───────────────────────────────────
  async chat(message: string, history: any[] = []): Promise<{ text: string; usedFallback: boolean }> {
    const systemPrompt = this.config.systemPrompt || "You are a helpful football assistant.";
    const historySection = history.length > 0 
      ? `CONVERSATION HISTORY:\n${history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}\n\n`
      : "";
    
    const userContent = `${historySection}USER MESSAGE: ${message}`;
    
    try {
      return await this.callWithFallback(systemPrompt, userContent);
    } catch (err: any) {
      return { text: `Error: ${err.message}`, usedFallback: false };
    }
  }

  // ── Data Processing (Organization focused) ───────────────────────────────────
  async process(data: any, userPrompt?: string): Promise<any> {
    const systemPrompt = this.config.systemPrompt || "You are an expert football analyst. Provide clear, data-driven betting insights.";
    const inputJson = JSON.stringify(data).substring(0, 100000);
    
    // If a prompt is provided, we assume it already contains the necessary context
    const userContent = userPrompt || `Analyze this match data and provide betting insights:\n\n${inputJson}`;

    try {
      const { text, usedFallback } = await this.callWithFallback(systemPrompt, userContent);
      return { summary: text, structuredData: {}, success: true, usedFallback };
    } catch (err: any) {
      return {
        summary: `AI Processing Failed: ${err.message}`,
        structuredData: {},
        success: false
      };
    }
  }


  // ── Batch prediction — returns all predictions for a set of matches ─────────
  async predictBatch(
    matches: any[],
    chatContext?: string
  ): Promise<PredictionResult[]> {
    const systemPrompt = this.config.systemPrompt || "You are an expert football betting analyst.";

    const matchSummary = matches.map((m, i) =>
      `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} [${m.league}] | H:${m.odds?.home ?? '?'} D:${m.odds?.draw ?? '?'} A:${m.odds?.away ?? '?'} | BTTS:${m.odds?.btts ?? 'N/A'} | Over2.5:${m.odds?.over25 ?? 'N/A'}`
    ).join('\n');

    const chatSection = chatContext
      ? `\n\nCRITICAL CONTEXT — The user has provided specific instructions in the chat history. YOU MUST FOLLOW THESE INSTRUCTIONS FOR YOUR ANALYSIS:\n${chatContext}`
      : '';

    const userContent = `${chatSection}

AVAILABLE MATCHES TODAY:
${matchSummary}

TASK: Perform a deep statistical analysis for EVERY match listed above. 

IMPORTANT RULES FOR ACCURACY AND DIVERSITY:
1. MARKET DIVERSITY: Do NOT default to "Over 2.5 Goals". Evaluate ALL markets: 1X2 (Home/Away/Draw), Double Chance, GG/BTTS, and Under 2.5.
2. EVIDENCE-BASED: Justify every prediction using the provided odds and context.
3. RISK MANAGEMENT: For accumulators, prefer high-probability (0.65+) outcomes. If the data is 50/50, assign a lower probability.
4. USER INSTRUCTIONS: If the chat context above asks for specific match counts or market focus, prioritize those in your JSON output.

RETURN a JSON array only:
[
  {
    "match": "Team A vs Team B",
    "prediction": "Home Win",
    "odds": 1.45,
    "probability": 0.82,
    "reasoning": "Home team has won 90% of home games this season. Visiting team is missing their top striker. Odds of 1.45 indicate strong bookmaker confidence."
  },
  {
    "match": "Team C vs Team D",
    "prediction": "BTTS - Yes",
    "odds": 1.85,
    "probability": 0.68,
    "reasoning": "Both teams have scored in their last 5 head-to-head encounters. Defensive stats for both sides are weak while attacking forms are high."
  }
]`;

    try {
      const { text } = await this.callWithFallback(systemPrompt, userContent);
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err: any) {
      console.error('[AI] Batch prediction failed:', err.message);
      // Return empty array so slip generation can handle gracefully
      return [];
    }
  }

  // ── Legacy single predict (kept for compatibility) ─────────────────────────
  async predict(matchData: any, userPrompt?: string): Promise<PredictionResult> {
    const systemPrompt = this.config.systemPrompt || "Predict the outcome of this football match.";
    const userContent = `Return a single JSON object with fields: match, prediction, odds, probability (0-1), reasoning.\n\nMatch data: ${JSON.stringify(matchData)}`;

    try {
      const { text } = await this.callWithFallback(systemPrompt, userContent);
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (err: any) {
      return {
        match: `${matchData.homeTeam ?? '?'} vs ${matchData.awayTeam ?? '?'}`,
        prediction: 'Unavailable',
        odds: 1.0,
        probability: 0,
        reasoning: `Prediction unavailable: ${err.message}`
      };
    }
  }

  async extractFromHtml(html: string): Promise<PredictionResult[]> {
    const systemPrompt = "Extract match data from HTML content.";
    const userContent = `Return a JSON array of objects with: match (Home vs Away), odds, reasoning.\n\n${html.substring(0, 20000)}`;
    try {
      const { text } = await this.callWithFallback(systemPrompt, userContent);
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return [];
    }
  }

  // ── Multimodal specific method for extracting data and validating from image ─────────
  async analyzeImage(
    base64Data: string,
    mimeType: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    try {
      const { text } = await this.callWithFallback(systemPrompt, userPrompt, { base64: base64Data, mimeType });
      return text;
    } catch (err: any) {
      throw new Error(`Multimodal analysis failed: ${err.message}`);
    }
  }
}
