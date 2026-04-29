import { AIFactory, AIConfig, PredictionResult } from "../ai/provider";
import { MatchData } from "./scraper";

export interface BetSlip {
  id: string;
  matches: PredictionResult[];
  totalOdds: number;
  confidence: number;
  targetOdds: number;
}

export class AnalystAgent {
  private aiFactory: AIFactory;

  constructor(config: AIConfig) {
    this.aiFactory = new AIFactory(config);
  }

  async generateSlips(matches: MatchData[], targetOdds: number[] = [2, 5, 10], userPrompt?: string): Promise<BetSlip[]> {
    console.log(`Generating slips for target odds: ${targetOdds.join(', ')}`);
    
    const allPredictions: PredictionResult[] = [];
    for (const match of matches) {
      const prediction = await this.aiFactory.predict(match, userPrompt);
      allPredictions.push(prediction);
    }

    const sortedPredictions = [...allPredictions].sort((a, b) => b.probability - a.probability);
    const slips: BetSlip[] = [];

    for (const target of targetOdds) {
      let currentSlip: PredictionResult[] = [];
      let currentOdds = 1.0;
      let combinedConfidence = 1.0;

      for (const pred of sortedPredictions) {
        if (currentOdds >= target) break;
        currentSlip.push(pred);
        currentOdds *= pred.odds;
        combinedConfidence *= pred.probability;
      }

      slips.push({
        id: `SLIP-${target}-${Date.now()}`,
        matches: currentSlip,
        totalOdds: parseFloat(currentOdds.toFixed(2)),
        confidence: Math.round(combinedConfidence * 100),
        targetOdds: target
      });
    }

    return slips;
  }
}
