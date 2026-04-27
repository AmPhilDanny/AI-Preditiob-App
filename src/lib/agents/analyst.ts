import { AIFactory, AIConfig, PredictionResult } from "../ai/provider";
import { MatchData } from "./scraper";

export class AnalystAgent {
  private aiFactory: AIFactory;

  constructor(config: AIConfig) {
    this.aiFactory = new AIFactory(config);
  }

  async analyzeMatches(matches: MatchData[]): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];

    for (const match of matches) {
      // Logic to find "2-odd" opportunities
      // Only analyze if there's a 2-odd outcome available
      const hasTwoOdd = Object.values(match.odds).some(odd => odd >= 1.90 && odd <= 2.20);
      
      if (hasTwoOdd) {
        const prediction = await this.aiFactory.predict(match);
        results.push(prediction);
      }
    }

    return results;
  }
}
