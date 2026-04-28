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

  async predict(matchData: any): Promise<PredictionResult> {
    const prompt = this.config.systemPrompt || "Predict the outcome of this football match.";
    
    switch (this.config.provider) {
      case 'gemini':
        return this.predictWithGemini(matchData, prompt);
      case 'grok':
        return this.predictWithGrok(matchData, prompt);
      case 'mistral':
        return this.predictWithMistral(matchData, prompt);
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
}
