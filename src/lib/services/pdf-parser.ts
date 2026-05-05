import { AIFactory, AIConfig, AIProvider } from '../ai/provider';
import { configService } from './config';

export interface ExtractedMarketMatch {
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchTime: string;
  markets: {
    fullTime: { home: number; draw: number; away: number; code?: string };
    halfTime?: { home: number; draw: number; away: number; code?: string };
    secondHalf?: { home: number; draw: number; away: number; code?: string };
    totalGoals: {
      over25: number;
      under25: number;
      over35?: number;
      under35?: number;
    };
    doubleChance?: { homeDraw: number; homeAway: number; drawAway: number };
    btts?: { yes: number; no: number };
    codes?: Record<string, string>; // Store all the special bookmaker codes
  };
}

export class PDFParserService {
  private aiFactory: AIFactory | null = null;

  private async initAI() {
    if (this.aiFactory) return;
    const config = await configService.getConfig();
    
    // ── Primary provider selection ──────────────────────────────────────────
    let provider: AIProvider = 'gemini';
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
    const allEnabledProviders: Array<{ provider: AIProvider; apiKey: string; model: string }> = [];
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
      allEnabledProviders,
      systemPrompt: "You are an expert data extractor specialized in bookmaker odds sheets. Your goal is to convert messy text from a PDF into highly accurate, structured JSON match data."
    };
    
    this.aiFactory = new AIFactory(aiConfig);
  }

  async parseOddsPDF(buffer: Buffer): Promise<ExtractedMarketMatch[]> {
    await this.initAI();
    
    try {
      console.log('[PDF-PARSER] Polyfilling DOMMatrix for Node environment...');
      // @ts-ignore
      if (typeof global !== 'undefined' && !global.DOMMatrix) {
        const DM = require('dommatrix');
        // @ts-ignore
        global.DOMMatrix = DM.DOMMatrix || DM.default || DM;
      }

      console.log('[PDF-PARSER] Dynamically importing pdf-parse...');
      // Dynamic import to avoid build-time issues with legacy CJS modules
      const pdf = require('pdf-parse');
      
      console.log('[PDF-PARSER] Extracting text from buffer...');
      const data = await pdf(buffer);
      const rawText = data.text;
      
      console.log(`[PDF-PARSER] Extracted ${rawText.length} characters. Sending to AI for structured parsing...`);
      
      // We process in chunks if the text is too long, but for a single sheet 2.0 Flash context is huge.
      const prompt = `
        EXTRACT ALL MATCH DATA FROM THIS BOOKMAKER ODDS SHEET.
        
        The text contains multiple matches with odds for:
        1. Full-Time (1X2)
        2. Half-Time (1X2)
        3. Second-Half (1X2)
        4. Total Goals (Over/Under 2.5 and 3.5)
        5. Double Chance (1X, 12, X2)
        6. Both Teams to Score (Yes/No)
        7. Booking codes for specific selections.
        
        STRICT RULES:
        - Return ONLY a valid JSON array of objects.
        - Each object MUST follow this structure:
          {
            "homeTeam": "...",
            "awayTeam": "...",
            "league": "...",
            "matchTime": "YYYY-MM-DD HH:mm",
            "markets": {
              "fullTime": { "home": 1.5, "draw": 3.4, "away": 5.0, "code": "..." },
              "halfTime": { "home": 2.1, "draw": 2.0, "away": 4.5 },
              "totalGoals": { "over25": 1.8, "under25": 1.9, "over35": 2.5, "under35": 1.4 },
              "doubleChance": { "homeDraw": 1.15, "homeAway": 1.25, "drawAway": 1.95 },
              "btts": { "yes": 1.75, "no": 1.95 },
              "codes": { "correctScore": "...", "htft": "..." }
            }
          }
        
        TEXT TO PARSE:
        ${rawText.substring(0, 50000)}
      `;

      if (!this.aiFactory) throw new Error('AI Factory not initialized');
      
      const { text: resultText } = await this.aiFactory.chat(prompt);
      
      // Robust JSON extraction: find the first '[' and the last ']'
      const jsonMatch = resultText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('[PDF-PARSER] No JSON array found in AI response:', resultText);
        throw new Error('The AI model could not find match data in this document. Please ensure it is a valid betting odds sheet.');
      }

      try {
        const cleaned = jsonMatch[0];
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseErr) {
        console.error('[PDF-PARSER] JSON Parse Error:', parseErr);
        throw new Error('The AI generated malformed data. Please try uploading the document again.');
      }
    } catch (err: any) {
      console.error('[PDF-PARSER] Failed to parse PDF:', err.message);
      throw err;
    }
  }
}

export const pdfParserService = new PDFParserService();
