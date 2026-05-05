import { AIFactory, AIConfig } from "../ai/provider";
import prisma from "../prisma";

export class ProcessorAgent {
  private aiFactory: AIFactory;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.aiFactory = new AIFactory(config);
  }

  async processRawData(days: number = 30): Promise<number> {
    console.log(`Processor Agent: Starting data organization for the last ${days} days...`);

    // 1. Fetch raw scraped data
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const rawData = await prisma.scrapedData.findMany({
      where: {
        createdAt: {
          gte: dateLimit
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5000 // Cap at 5000 records max
    });

    if (rawData.length === 0) {
      console.log(`Processor Agent: No raw data found for the last ${days} days.`);
      return 0;
    }

    console.log(`Processor Agent: Found ${rawData.length} records. Preparing AI summary...`);

    // 2. Build a compact summary for AI to avoid context window issues
    // Instead of sending full JSON, send a structured text summary
    const sampleSize = Math.min(rawData.length, 100);
    const sample = rawData.slice(0, sampleSize);
    
    const matchSummary = sample.map((m, i) => {
      const odds = m.odds as any;
      return `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} [${m.league}] | H:${odds?.home ?? '?'} D:${odds?.draw ?? '?'} A:${odds?.away ?? '?'} | Source: ${m.sourceApi}`;
    }).join('\n');

    const processorPrompt = this.config.systemPrompt
      || "You are an expert football data analyst. Analyze the following match data and provide comprehensive betting insights.";

    const userContent = `${processorPrompt}

TOTAL MATCHES IN DATABASE: ${rawData.length}
SHOWING SAMPLE OF ${sampleSize} MATCHES FOR ANALYSIS:

${matchSummary}

Provide a structured analysis with:
1. Key market trends across these matches
2. Notable odds patterns (favorites, upsets, value bets)
3. League-by-league breakdown
4. Top 10 recommended bets from this dataset
5. Overall data quality assessment`;

    // 3. Use AI to generate insights
    let aiSummary = '';
    let aiSuccess = false;

    try {
      const result = await this.aiFactory.process(rawData.slice(0, 50), userContent);
      if (result.success && result.summary && result.summary.length > 100) {
        aiSummary = result.summary;
        aiSuccess = true;
        console.log(`Processor Agent: AI analysis successful. Summary length: ${aiSummary.length}`);
      } else {
        throw new Error(result.summary || 'AI returned empty summary');
      }
    } catch (err: any) {
      console.error(`Processor Agent: AI failed (${err.message}). Generating fallback summary...`);
      // Generate a meaningful fallback summary without AI
      aiSummary = generateFallbackSummary(rawData);
      aiSuccess = false;
    }

    // 4. Build a compact structuredData snapshot (just the key fields, max 500 records)
    const structuredSnapshot = rawData.slice(0, 500).map(m => {
      const odds = m.odds as any;
      return {
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        sourceApi: m.sourceApi,
        matchDate: m.matchDate,
        odds: odds ? {
          home: odds.home,
          draw: odds.draw,
          away: odds.away,
          btts: odds.btts,
          over25: odds.over25,
        } : null,
      };
    });

    // 5. Save processed intelligence record
    await prisma.processedData.create({
      data: {
        matchDate: new Date(),
        homeTeam: "Intelligence Summary",
        awayTeam: `Analysis of ${rawData.length} matches`,
        league: "Global Intelligence",
        summary: aiSummary,
        structuredData: structuredSnapshot as any
      }
    });

    console.log(`Processor Agent: Saved intelligence report. Records: ${rawData.length}, AI Success: ${aiSuccess}`);
    return rawData.length;
  }

  async cleanupOldData(days: number = 10): Promise<{ scraped: number; processed: number }> {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const deletedScraped = await prisma.scrapedData.deleteMany({
      where: {
        createdAt: {
          lt: dateLimit
        }
      }
    });

    const deletedProcessed = await prisma.processedData.deleteMany({
      where: {
        createdAt: {
          lt: dateLimit
        }
      }
    });

    return {
      scraped: deletedScraped.count,
      processed: deletedProcessed.count
    };
  }

  async importManualData(rawText: string): Promise<any> {
    console.log("Processor Agent: Parsing manual data...");
    
    // Check if it's CSV (has commas and multiple lines)
    if (rawText.includes(',') && rawText.split('\n').length > 1) {
      try {
        return await this.importCSVData(rawText);
      } catch (e) {
        console.warn("CSV parsing failed, falling back to AI extraction", e);
      }
    }

    // Step 1: Use AI to extract structured match data from raw copy-paste text
    const extractionPrompt = `
      You are an expert data extractor. The following text is copied from a bookmaker website (like Bet365, 1xBet, etc.).
      Extract all matches, leagues, dates, and odds (Home, Draw, Away, BTTS, Over 2.5) if available.
      Return the output as a valid JSON object:
      {
        "matches": [
          {
            "homeTeam": "Team A",
            "awayTeam": "Team B",
            "league": "League X",
            "matchDate": "ISO Date or null",
            "odds": {
              "home": 1.5,
              "draw": 3.4,
              "away": 5.0,
              "btts": "Yes/No",
              "over25": 1.8
            }
          }
        ]
      }
      Return ONLY the JSON object.
    `;

    const { text: extractedJson } = await this.aiFactory.chat(
      `Text to extract from:\n\n${rawText.substring(0, 15000)}`,
      [{ role: 'system', content: extractionPrompt }]
    );

    let parsed;
    try {
      parsed = JSON.parse(extractedJson.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.error("Failed to parse AI extraction result:", extractedJson);
      throw new Error("AI failed to extract structured data from the text.");
    }

    if (!parsed.matches || !Array.isArray(parsed.matches)) {
      throw new Error("No matches found in the provided text.");
    }

    // Step 2: Save to ScrapedData table
    const savedRecords = [];
    for (const m of parsed.matches) {
      const record = await prisma.scrapedData.create({
        data: {
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          league: m.league || "Unknown",
          matchDate: m.matchDate ? new Date(m.matchDate) : null,
          odds: m.odds || {},
          sourceApi: "Manual Import",
        }
      });
      savedRecords.push(record);
    }

    return this.generateImportAnalysis(parsed.matches, savedRecords.length);
  }

  async importCSVData(csvText: string): Promise<any> {
    console.log("Processor Agent: Processing CSV data...");
    const lines = csvText.trim().split('\n');
    const matches: any[] = [];
    
    // Skip header if it exists
    const startIndex = (lines[0].toLowerCase().includes('event') || lines[0].toLowerCase().includes('date')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV split
      const cols = line.split(',').map(c => c.trim());
      
      // Expected Structure: 
      // DateTime, EventName, FT(H,D,A), HT(H,D,A), SH(H,D,A), Goals(Line,U,O), DC(HD,DA,HA), BTTS(Y,N)
      if (cols.length < 5) continue; 

      const dateTime = cols[0];
      const eventName = cols[1]; // "Team A vs Team B"
      
      let homeTeam = "Unknown";
      let awayTeam = "Unknown";

      if (eventName.includes(' vs ')) {
        [homeTeam, awayTeam] = eventName.split(' vs ');
      } else if (eventName.includes(' - ')) {
        [homeTeam, awayTeam] = eventName.split(' - ');
      } else {
        homeTeam = eventName;
      }

      const odds: any = {
        home: parseFloat(cols[2]) || 0,
        draw: parseFloat(cols[3]) || 0,
        away: parseFloat(cols[4]) || 0,
        ht: cols.length >= 8 ? { home: parseFloat(cols[5]), draw: parseFloat(cols[6]), away: parseFloat(cols[7]) } : null,
        sh: cols.length >= 11 ? { home: parseFloat(cols[8]), draw: parseFloat(cols[9]), away: parseFloat(cols[10]) } : null,
        goals: cols.length >= 14 ? { line: cols[11], under: parseFloat(cols[12]), over: parseFloat(cols[13]) } : null,
        dc: cols.length >= 17 ? { hd: parseFloat(cols[14]), da: parseFloat(cols[15]), ha: parseFloat(cols[16]) } : null,
        btts: cols.length >= 19 ? { yes: parseFloat(cols[17]), no: parseFloat(cols[18]) } : null,
      };

      // Standardize for DB
      const standardOdds = {
        home: odds.home,
        draw: odds.draw,
        away: odds.away,
        btts: odds.btts?.yes > 0 ? "Yes" : "No",
        over25: odds.goals?.over || 0
      };

      matches.push({
        homeTeam,
        awayTeam,
        league: "CSV Import",
        matchDate: dateTime ? new Date(dateTime) : new Date(),
        odds: standardOdds,
        rawStats: odds
      });
    }

    const savedRecords = [];
    for (const m of matches) {
      const record = await prisma.scrapedData.create({
        data: {
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          league: m.league,
          matchDate: m.matchDate,
          odds: m.odds,
          rawStats: m.rawStats,
          sourceApi: "CSV Import",
        }
      });
      savedRecords.push(record);
    }

    return this.generateImportAnalysis(matches, savedRecords.length);
  }

  private async generateImportAnalysis(matches: any[], count: number): Promise<any> {
    const latestIntelligence = await prisma.processedData.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    const analysisPrompt = `
      You are a Master Football Analyst. We have just imported new match data.
      Your task is to compare these new matches with our existing system intelligence and provide a "Super Informed Analysis".
      
      NEW MATCHES IMPORTED:
      ${JSON.stringify(matches.slice(0, 20), null, 2)}

      EXISTING SYSTEM INTELLIGENCE:
      ${latestIntelligence?.summary || "No prior intelligence found."}

      Provide a high-impact Markdown report including:
      1. **Match Previews**: Analysis of the new matches using both the new odds and our historical data.
      2. **Strategic Insights**: Where do we see the most value?
      3. **Final Recommendations**: Top picks from this specific import.
    `;

    const { text: analysisResult } = await this.aiFactory.chat(
      "Generate Super Informed Analysis.",
      [{ role: 'system', content: analysisPrompt }]
    );

    return {
      success: true,
      count: count,
      analysis: analysisResult,
      matches: matches
    };
  }
}

/**
 * Generate a meaningful summary from raw data without AI assistance
 */
function generateFallbackSummary(rawData: any[]): string {
  const totalMatches = rawData.length;
  
  // Group by league
  const byLeague = rawData.reduce((acc: Record<string, number>, m) => {
    const league = m.league || 'Unknown';
    acc[league] = (acc[league] || 0) + 1;
    return acc;
  }, {});
  
  const topLeagues = Object.entries(byLeague)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  // Group by source
  const bySource = rawData.reduce((acc: Record<string, number>, m) => {
    acc[m.sourceApi] = (acc[m.sourceApi] || 0) + 1;
    return acc;
  }, {});
  
  // Analyze odds
  const withOdds = rawData.filter(m => m.odds && (m.odds as any).home);
  let avgHomeOdds = 0, avgDrawOdds = 0, avgAwayOdds = 0;
  
  if (withOdds.length > 0) {
    avgHomeOdds = withOdds.reduce((sum, m) => sum + ((m.odds as any).home || 0), 0) / withOdds.length;
    avgDrawOdds = withOdds.reduce((sum, m) => sum + ((m.odds as any).draw || 0), 0) / withOdds.length;
    avgAwayOdds = withOdds.reduce((sum, m) => sum + ((m.odds as any).away || 0), 0) / withOdds.length;
  }

  const leagueBreakdown = topLeagues.map(([league, count]) => 
    `- **${league}**: ${count} matches (${((count/totalMatches)*100).toFixed(1)}%)`
  ).join('\n');

  const sourceBreakdown = Object.entries(bySource)
    .map(([src, count]) => `- **${src}**: ${count} records`)
    .join('\n');

  return `## Intelligence Report — Data Processing Summary

**Status:** Processed without AI (fallback mode — AI provider unavailable)
**Total Matches Analyzed:** ${totalMatches}
**Matches with Odds Data:** ${withOdds.length}

---

### 📊 Dataset Overview

| Metric | Value |
|--------|-------|
| Total Records | ${totalMatches} |
| Records with Odds | ${withOdds.length} |
| Avg Home Win Odds | ${avgHomeOdds.toFixed(2)} |
| Avg Draw Odds | ${avgDrawOdds.toFixed(2)} |
| Avg Away Win Odds | ${avgAwayOdds.toFixed(2)} |

---

### 🏆 Top Leagues by Match Count

${leagueBreakdown}

---

### 🔌 Data Sources

${sourceBreakdown}

---

### ℹ️ Note

This summary was generated automatically without AI analysis. To get full AI-powered betting insights and recommendations, ensure your AI provider API key is configured and run the processor again.`;
}
