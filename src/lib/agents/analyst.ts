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

  /**
   * Generate accumulator betting slips.
   *
   * @param matches     - Scraped match data from the DB
   * @param targetOdds  - Array of desired combined odds targets (e.g. [1, 2, 5, 10])
   * @param chatContext - Optional: recent chat conversation context to guide selection
   * @param options     - Optional: overrides for match counts or market preferences
   */
  async generateSlips(
    matches: MatchData[],
    targetOdds: number[] = [1, 2, 5, 10],
    chatContext?: string,
    options: Record<number, { maxMatches?: number; preferredMarket?: string }> = {}
  ): Promise<BetSlip[]> {
    console.log(`[AnalystAgent] Generating slips for targets: ${targetOdds.join(', ')}`);

    if (!matches.length) {
      console.warn('[AnalystAgent] No match data available');
      return targetOdds.map(t => ({
        id: `SLIP-${t}-${Date.now()}`,
        matches: [],
        totalOdds: 0,
        confidence: 0,
        targetOdds: t
      }));
    }

    // ── Step 1: Get AI predictions for ALL matches in a single batch call ─────
    const allPredictions = await this.aiFactory.predictBatch(
      matches.slice(0, 40), 
      chatContext
    );

    if (!allPredictions.length) {
      console.warn('[AnalystAgent] No predictions returned from AI batch');
      return targetOdds.map(t => ({
        id: `SLIP-${t}-${Date.now()}`,
        matches: [],
        totalOdds: 0,
        confidence: 0,
        targetOdds: t
      }));
    }

    // ── Step 2: Filter & sort by confidence (probability) ────────────────────
    const qualified = allPredictions
      .filter(p => p.probability >= 0.60 && p.odds >= 1.10)
      .sort((a, b) => b.probability - a.probability); 

    // ── Step 3: Build accumulators for each target ────────────────────────────
    const slips: BetSlip[] = [];

    for (const target of targetOdds) {
      const slipOptions = options[target] || {};
      const slip = this.buildAccumulator(qualified, target, slipOptions);
      slips.push(slip);
    }

    return slips;
  }

  /**
   * Build a single accumulator slip by greedily adding high-confidence
   * low-odds matches until we reach or exceed the target combined odds.
   *
   * @param target         - Combined odds target (e.g. 1, 2, 5, 10)
   * @param options        - Optional constraints:
   *                         - maxMatches: strictly limit match count
   *                         - preferredMarket: filter for specific markets (e.g. "GG", "1X2")
   */
  private buildAccumulator(
    predictions: PredictionResult[], 
    target: number, 
    options: { maxMatches?: number; preferredMarket?: string } = {}
  ): BetSlip {
    // Determine the preferred odds window for this target range
    let maxOddsPerMatch: number;
    let minProbability: number;

    if (target <= 1.5) { // Free / Very Safe
      maxOddsPerMatch = 2.50; // Allow slightly higher for a single pick if confident
      minProbability = 0.75;
    } else if (target <= 3) {
      maxOddsPerMatch = 1.65;
      minProbability = 0.72;
    } else if (target <= 6) {
      maxOddsPerMatch = 2.10;
      minProbability = 0.65;
    } else {
      maxOddsPerMatch = 2.60;
      minProbability = 0.60;
    }

    // ── Step 1: Filter to predictions that fit this tier ──────────────────────
    let pool = predictions.filter(
      p => p.odds <= maxOddsPerMatch && p.probability >= minProbability
    );

    // Filter by preferred market if specified (e.g. "GG")
    if (options.preferredMarket) {
      const marketLower = options.preferredMarket.toLowerCase();
      const filteredPool = pool.filter(p => 
        p.prediction.toLowerCase().includes(marketLower) || 
        p.reasoning.toLowerCase().includes(marketLower)
      );
      if (filteredPool.length > 0) pool = filteredPool;
    }

    // If pool is empty, fall back to the full sorted list
    const candidates = pool.length > 0 ? pool : predictions;

    const chosen: PredictionResult[] = [];
    let combinedOdds = 1.0;
    let combinedProbability = 1.0;
    const usedMatches = new Set<string>();

    // ── Step 2: Generation Logic ──────────────────────────────────────────────

    // Special Case: Target 1 (Free Bet) — return a SINGLE high-confidence match by default
    // OR respect the maxMatches if specified (e.g. "2 matches for free game")
    if (target <= 1.1 && !options.maxMatches) {
       if (candidates.length > 0) {
         const best = candidates[0];
         chosen.push(best);
         combinedOdds = best.odds;
         combinedProbability = best.probability;
       }
    } else {
      // Greedy accumulation: keep adding matches until target is reached or limit hit
      for (const pred of candidates) {
        if (combinedOdds >= target && chosen.length >= 1) break;
        if (options.maxMatches && chosen.length >= options.maxMatches) break;
        if (usedMatches.has(pred.match)) continue; // no duplicate matches

        chosen.push(pred);
        combinedOdds *= pred.odds;
        combinedProbability *= pred.probability;
        usedMatches.add(pred.match);
      }
    }

    // If we couldn't reach the target, still return what we have
    return {
      id: `SLIP-${target}-${Date.now()}`,
      matches: chosen,
      totalOdds: parseFloat(combinedOdds.toFixed(2)),
      confidence: Math.round(combinedProbability * 100),
      targetOdds: target
    };
  }
}
