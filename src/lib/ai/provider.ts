import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";

export type AIProvider = 'gemini' | 'grok' | 'mistral';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  // Fallback provider config
  fallbackProvider?: AIProvider;
  fallbackApiKey?: string;
  fallbackModel?: string;
}

export interface PredictionResult {
  match: string;
  prediction: string;
  odds: number;
  probability: number;
  reasoning: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Gemini helper
// ──────────────────────────────────────────────────────────────────────────────
async function callGemini(apiKey: string, model: string, parts: string[]): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });
  const result = await geminiModel.generateContent(parts);
  return result.response.text();
}

// ──────────────────────────────────────────────────────────────────────────────
// Mistral helper
// ──────────────────────────────────────────────────────────────────────────────
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

export class AIFactory {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PROCESS: main method used by the chat and processor agents
  // Tries primary provider first, falls back to secondary on error
  // ────────────────────────────────────────────────────────────────────────────
  async process(data: any, userPrompt?: string): Promise<any> {
    const systemPrompt = this.config.systemPrompt || "You are an expert football analyst. Provide clear, data-driven betting insights.";
    const fullPrompt = userPrompt ? `${systemPrompt}\n\nUser Request: ${userPrompt}` : systemPrompt;
    const inputJson = JSON.stringify(data).substring(0, 30000);

    // Try primary provider
    const primaryResult = await this._tryProcess(
      this.config.provider,
      this.config.apiKey,
      this.config.model,
      fullPrompt,
      inputJson
    );

    if (primaryResult.success) return primaryResult;

    // Fallback to secondary provider if configured
    if (this.config.fallbackProvider && this.config.fallbackApiKey) {
      console.log(`[AI] Primary provider failed, switching to fallback: ${this.config.fallbackProvider}`);
      const fallbackResult = await this._tryProcess(
        this.config.fallbackProvider,
        this.config.fallbackApiKey,
        this.config.fallbackModel || 'mistral-large-latest',
        fullPrompt,
        inputJson
      );
      if (fallbackResult.success) return { ...fallbackResult, usedFallback: true };
    }

    return {
      summary: primaryResult.summary, // return the original error message
      structuredData: data,
      success: false
    };
  }

  private async _tryProcess(
    provider: AIProvider,
    apiKey: string,
    model: string,
    fullPrompt: string,
    inputJson: string
  ): Promise<any> {
    try {
      let text = '';

      if (provider === 'gemini') {
        text = await callGemini(apiKey, model || 'gemini-2.5-flash', [
          fullPrompt,
          "Format your response as a clean, professional analysis of key matches and betting opportunities (GG, Over 2.5, Home win, Under 2.5, 1X2 etc). Use bullet points and be specific about which teams and why.",
          inputJson
        ]);
      } else if (provider === 'mistral') {
        text = await callMistral(
          apiKey,
          model || 'mistral-large-latest',
          fullPrompt,
          `Analyze this match data and answer the user's question:\n\n${inputJson}`
        );
      } else {
        return { summary: `Provider '${provider}' not yet implemented.`, structuredData: {}, success: false };
      }

      return {
        summary: text,
        structuredData: {},
        success: true
      };
    } catch (err: any) {
      const isQuota = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('rate');
      const errMsg = isQuota
        ? `⚠️ ${provider === 'gemini' ? 'Gemini' : 'Mistral'} quota exceeded. ${this.config.fallbackProvider ? 'Switching to backup provider...' : 'Please try again later or add a Mistral API key as backup.'}`
        : `AI Processing Failed (${provider}): ${err.message || 'Unknown Error'}`;

      console.error(`[AI] ${provider} error:`, err.message);
      return {
        summary: errMsg,
        structuredData: {},
        success: false
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PREDICT: for individual match prediction cards
  // ────────────────────────────────────────────────────────────────────────────
  async predict(matchData: any, userPrompt?: string): Promise<PredictionResult> {
    const prompt = this.config.systemPrompt || "Predict the outcome of this football match.";
    const fullPrompt = userPrompt ? `${prompt}\n\nUser Request: ${userPrompt}` : prompt;

    try {
      let text = '';
      if (this.config.provider === 'gemini') {
        text = await callGemini(this.config.apiKey, this.config.model || 'gemini-2.5-flash', [
          fullPrompt,
          "Return a JSON object with: match, prediction, odds, probability (0-1), reasoning.",
          JSON.stringify(matchData)
        ]);
      } else if (this.config.provider === 'mistral') {
        text = await callMistral(
          this.config.apiKey,
          this.config.model || 'mistral-large-latest',
          fullPrompt,
          `Return a JSON object with: match, prediction, odds, probability (0-1), reasoning. Data: ${JSON.stringify(matchData)}`
        );
      }

      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (err: any) {
      console.error("Prediction Error:", err);
      return {
        match: matchData.homeTeam + " vs " + matchData.awayTeam,
        prediction: "Error",
        odds: 0,
        probability: 0,
        reasoning: `Prediction failed: ${err.message || 'Unknown Error'}`
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // EXTRACT FROM HTML: for web scraper
  // ────────────────────────────────────────────────────────────────────────────
  async extractFromHtml(html: string): Promise<PredictionResult[]> {
    const prompt = "Extract match data from this HTML content. Return a JSON array of objects with: match (Home vs Away), odds, reasoning.";
    try {
      let text = '';
      if (this.config.provider === 'gemini') {
        text = await callGemini(this.config.apiKey, this.config.model || 'gemini-2.5-flash', [
          prompt, html.substring(0, 20000)
        ]);
      } else if (this.config.provider === 'mistral') {
        text = await callMistral(
          this.config.apiKey,
          this.config.model || 'mistral-large-latest',
          prompt,
          html.substring(0, 20000)
        );
      }
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (err) {
      console.error("HTML Extraction Error:", err);
    }
    return [];
  }
}
