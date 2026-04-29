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
    
    switch (this.config.provider) {
      case 'gemini':
        return this.predictWithGemini(matchData, fullPrompt);
      case 'grok':
        return this.predictWithGrok(matchData, fullPrompt);
      case 'mistral':
        return this.predictWithMistral(matchData, fullPrompt);
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  private async predictWithGemini(data: any, prompt: string): Promise<PredictionResult> {
    console.log(`Predicting with Gemini using prompt: ${prompt.substring(0, 50)}...`);
    return {
      match: data.homeTeam + " vs " + data.awayTeam,
      prediction: "Home Win",
      odds: data.odds?.home || 2.05,
      probability: 0.52,
      reasoning: "Reasoning generated based on the custom admin prompt and team form."
    };
  }

  private async predictWithGrok(data: any, prompt: string): Promise<PredictionResult> {
    console.log(`Predicting with Grok using prompt: ${prompt.substring(0, 50)}...`);
    return {
      match: data.homeTeam + " vs " + data.awayTeam,
      prediction: "Away Win",
      odds: data.odds?.away || 2.10,
      probability: 0.49,
      reasoning: "Grok's real-time analysis adjusted by the admin instructions."
    };
  }

  private async predictWithMistral(data: any, prompt: string): Promise<PredictionResult> {
    console.log(`Predicting with Mistral using prompt: ${prompt.substring(0, 50)}...`);
    return {
      match: data.homeTeam + " vs " + data.awayTeam,
      prediction: "Draw",
      odds: data.odds?.draw || 3.20,
      probability: 0.35,
      reasoning: "Mistral reasoning tailored to the specified analysis criteria."
    };
  }

  async process(data: any, userPrompt?: string): Promise<any> {
    const prompt = this.config.systemPrompt || "Process this data.";
    const fullPrompt = userPrompt ? `${prompt}\n\nUser Request: ${userPrompt}` : prompt;
    
    // For now, simulating AI processing. In production, this would call the actual APIs.
    console.log(`Processing with ${this.config.provider} using prompt: ${fullPrompt.substring(0, 50)}...`);
    
    return {
      summary: `Processed ${Array.isArray(data) ? data.length : 1} items.`,
      structuredData: data,
      success: true
    };
  }

  async extractFromHtml(html: string): Promise<PredictionResult[]> {
    console.log(`Extracting match data from HTML using ${this.config.provider}...`);
    // Simulated extraction logic
    // In a real app, you would pass the HTML to the LLM with a specific extraction prompt
    return [
      {
        match: "Simulated Match from Web",
        prediction: "Home Win",
        odds: 1.85,
        probability: 0.65,
        reasoning: "Extracted from web content analysis."
      }
    ];
  }
}
