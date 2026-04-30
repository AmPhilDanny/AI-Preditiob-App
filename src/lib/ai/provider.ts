import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = 'gemini' | 'grok' | 'mistral';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  systemPrompt?: string;
}

export interface PredictionResult {
  match: string;
  prediction: string;
  odds: number;
  probability: number;
  reasoning: string;
}

export class AIFactory {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async predict(matchData: any, userPrompt?: string): Promise<PredictionResult> {
    const prompt = this.config.systemPrompt || "Predict the outcome of this football match.";
    const fullPrompt = userPrompt ? `${prompt}\n\nUser Request: ${userPrompt}` : prompt;
    
    if (this.config.provider === 'gemini') {
      return this.predictWithGemini(matchData, fullPrompt);
    }
    
    // Fallback for other providers (if not yet implemented)
    return {
      match: matchData.homeTeam + " vs " + matchData.awayTeam,
      prediction: "Analysis Pending",
      odds: 1.0,
      probability: 0.5,
      reasoning: "AI Provider not fully implemented for predictions."
    };
  }

  private async predictWithGemini(data: any, prompt: string): Promise<PredictionResult> {
    try {
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({ model: this.config.model || "gemini-2.0-flash" });
      
      const input = JSON.stringify(data);
      const result = await model.generateContent([
        prompt,
        "Return a JSON object with: match, prediction, odds, probability (0-1), reasoning.",
        input
      ]);
      const text = result.response.text();
      const parsed = JSON.parse(text.replace(/```json|```/g, ""));
      
      return parsed;
    } catch (err: any) {
      console.error("Gemini Prediction Error:", err);
      return {
        match: data.homeTeam + " vs " + data.awayTeam,
        prediction: "Error",
        odds: 0,
        probability: 0,
        reasoning: `Failed to connect to Gemini: ${err.message || 'Unknown Error'}`
      };
    }
  }

  async process(data: any, userPrompt?: string): Promise<any> {
    const prompt = this.config.systemPrompt || "Process this football data and identify patterns.";
    const fullPrompt = userPrompt ? `${prompt}\n\nUser Request: ${userPrompt}` : prompt;
    
    if (this.config.provider === 'gemini') {
      try {
        const genAI = new GoogleGenerativeAI(this.config.apiKey);
        const model = genAI.getGenerativeModel({ model: this.config.model || "gemini-2.0-flash" });
        
        const input = JSON.stringify(data).substring(0, 30000); // Guard against token limits
        const result = await model.generateContent([
          fullPrompt,
          "Format your response as a clean summary of key matches and betting opportunities (GG, Over 2.5, Home win etc).",
          input
        ]);
        
        return {
          summary: result.response.text(),
          structuredData: data,
          success: true
        };
      } catch (err: any) {
        console.error("Gemini Processing Error:", err);
        return {
          summary: `AI Processing Failed: ${err.message || 'Unknown Error'}. Please check your API key and connection.`,
          structuredData: data,
          success: false
        };
      }
    }

    return {
      summary: `Processed ${Array.isArray(data) ? data.length : 1} items (Offline Mode - No Provider).`,
      structuredData: data,
      success: true
    };
  }

  async extractFromHtml(html: string): Promise<PredictionResult[]> {
    if (this.config.provider === 'gemini') {
      try {
        const genAI = new GoogleGenerativeAI(this.config.apiKey);
        const model = genAI.getGenerativeModel({ model: this.config.model || "gemini-2.0-flash" });
        
        const result = await model.generateContent([
          "Extract match data from this HTML content. Return a JSON array of objects with: match (Home vs Away), odds, reasoning.",
          html.substring(0, 20000)
        ]);
        
        const text = result.response.text();
        return JSON.parse(text.replace(/```json|```/g, ""));
      } catch (err) {
        console.error("Gemini Extraction Error:", err);
      }
    }
    
    return [];
  }
}
