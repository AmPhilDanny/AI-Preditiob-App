import { AIFactory, AIConfig, PredictionResult } from "../ai/provider";
import { MatchData } from "./scraper";

export interface BetSlip {
  id: string;
  matches: PredictionResult[];
  totalOdds: number;
  confidence: number;
  targetOdds: number | string;
  category?: string;
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
    targetOdds: (number | string)[] = [1, 2, 5, 10],
    chatContext?: string,
    options: Record<string, { maxMatches?: number; preferredMarket?: string }> = {}
  ): Promise<BetSlip[]> {
    console.log(`[AnalystAgent] Generating slips for targets: ${targetOdds.join(', ')}`);

    if (!matches.length) {
      console.warn('[AnalystAgent] No match data available');
      return [];
    }

    // ── Step 1: Get AI predictions for ALL matches in a single batch call ─────
    const allPredictions = await this.aiFactory.predictBatch(
      matches.slice(0, 40), 
      chatContext
    );

    if (!allPredictions.length) {
      console.warn('[AnalystAgent] No predictions returned from AI batch');
      return [];
    }

    // ── Step 2: Filter & sort by confidence (probability) ────────────────────
    const qualified = allPredictions
      .filter(p => p.probability >= 0.60 && p.odds >= 1.10)
      .sort((a, b) => b.probability - a.probability); 

    // ── Step 3: Build accumulators for each target ────────────────────────────
    const slips: BetSlip[] = [];
    const globalUsedMatches = new Set<string>();

    for (const target of targetOdds) {
      if (target === 'SCENARIO_A') {
        const slipsA = this.buildScenarioA(qualified);
        slips.push(...slipsA);
      } else if (target === 'SCENARIO_B') {
        const slipsB = this.buildScenarioB(qualified);
        slips.push(...slipsB);
      } else if (typeof target === 'number') {
        const slipOptions = options[target] || {};
        const slip = this.buildAccumulator(qualified, target, slipOptions, globalUsedMatches);
        slips.push(slip);
      }
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
    options: { maxMatches?: number; preferredMarket?: string } = {},
    globalUsedMatches?: Set<string>
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

    // ── Step 2: Generation Logic ──────────────────────────────────────────────
    
    // ADJUSTMENT: Force at least 2.0 odds if not a 'free' game
    const effectiveTarget = target < 2 && target > 1.1 ? 2.0 : target;
    const minGames = effectiveTarget >= 2.0 ? 2 : 1;
    const maxGames = options.maxMatches || 4;

    // Special Case: Target 1 (Free Bet) — return a SINGLE high-confidence match by default
    if (target <= 1.1 && !options.maxMatches) {
       const best = candidates.find(p => !globalUsedMatches?.has(p.match));
       if (best) {
         chosen.push(best);
         combinedOdds = best.odds;
         combinedProbability = best.probability;
         globalUsedMatches?.add(best.match);
       }
    } else {
      // Greedy accumulation: keep adding matches until target is reached or limit hit
      for (const pred of candidates) {
        if (combinedOdds >= effectiveTarget && chosen.length >= minGames) break;
        if (chosen.length >= maxGames) break;
        if (globalUsedMatches?.has(pred.match)) continue; // no duplicate matches across ANY ticket

        chosen.push(pred);
        combinedOdds *= pred.odds;
        combinedProbability *= pred.probability;
        globalUsedMatches?.add(pred.match);
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

  /**
   * Helper to generate combinations of a specific size from an array
   */
  private getCombinations<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    
    function combine(start: number, currentCombo: T[]) {
      if (currentCombo.length === size) {
        result.push([...currentCombo]);
        return;
      }
      for (let i = start; i < array.length; i++) {
        currentCombo.push(array[i]);
        combine(i + 1, currentCombo);
        currentCombo.pop();
      }
    }
    
    combine(0, []);
    return result;
  }

  private buildScenarioA(predictions: PredictionResult[]): BetSlip[] {
    // 12 games, 4 tickets of 3
    const top12 = predictions.slice(0, 12);
    const slips: BetSlip[] = [];
    
    for (let i = 0; i < top12.length; i += 3) {
      const chunk = top12.slice(i, i + 3);
      if (chunk.length === 0) continue;
      
      let combinedOdds = 1.0;
      let combinedProbability = 1.0;
      for (const pred of chunk) {
        combinedOdds *= pred.odds;
        combinedProbability *= pred.probability;
      }
      
      slips.push({
        id: `SLIP-A-${Date.now()}-${i}`,
        matches: chunk,
        totalOdds: parseFloat(combinedOdds.toFixed(2)),
        confidence: Math.round(combinedProbability * 100),
        targetOdds: 0,
        category: 'Scenario A'
      });
    }
    
    return slips;
  }

  private buildScenarioB(predictions: PredictionResult[]): BetSlip[] {
    // Top 8 games, 12 tickets of 3 combinations
    const top8 = predictions.slice(0, 8);
    const combos = this.getCombinations(top8, 3);
    
    // Evaluate combos
    const evaluatedCombos = combos.map(chunk => {
      let combinedOdds = 1.0;
      let combinedProbability = 1.0;
      for (const pred of chunk) {
        combinedOdds *= pred.odds;
        combinedProbability *= pred.probability;
      }
      return { chunk, combinedOdds, combinedProbability };
    });
    
    // Sort by combined probability descending
    evaluatedCombos.sort((a, b) => b.combinedProbability - a.combinedProbability);
    
    // Take top 12
    const top12Combos = evaluatedCombos.slice(0, 12);
    
    const slips: BetSlip[] = [];
    top12Combos.forEach((c, i) => {
      slips.push({
        id: `SLIP-B-${Date.now()}-${i}`,
        matches: c.chunk,
        totalOdds: parseFloat(c.combinedOdds.toFixed(2)),
        confidence: Math.round(c.combinedProbability * 100),
        targetOdds: 0,
        category: 'Scenario B'
      });
    });
    
    return slips;
  }
}
