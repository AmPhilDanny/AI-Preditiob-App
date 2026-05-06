import { AIFactory, AIConfig } from "../ai/provider";
import prisma from "../prisma";

export class ProcessorAgent {
  private aiFactory: AIFactory;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.aiFactory = new AIFactory(config);
  }

  async processRawData(days: number = 2): Promise<number> {
    console.log(`Processor Agent: Starting AI-powered analysis for upcoming matches over the next ${days} days...`);

    // 1. Fetch matches happening from NOW onwards (upcoming games only)
    const now = new Date();
    // Round to the start of the current minute to be precise
    now.setSeconds(0, 0);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const rawData = await prisma.scrapedData.findMany({
      where: {
        matchDate: {
          gte: now,
          lte: futureDate
        }
      },
      orderBy: { matchDate: 'asc' },
      take: 1000 
    });

    if (rawData.length === 0) {
      console.log(`Processor Agent: No upcoming matches found between ${now.toISOString()} and ${futureDate.toISOString()}.`);
      return 0;
    }

    // 2. Fetch "System Memory" (previous intelligence report)
    const lastIntelligence = await prisma.processedData.findFirst({
      where: {
        homeTeam: "Intelligence Summary" // Only get actual summaries, not fallback records if any exist
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Processor Agent: Found ${rawData.length} upcoming records. Preparing diverse data sample...`);

    // 3. Deduplicate matches and build a diverse summary
    const uniqueMatchesMap = new Map<string, typeof rawData[0]>();
    
    for (const match of rawData) {
      const sig = getMatchSignature(match);
      if (uniqueMatchesMap.has(sig)) {
        // Match exists in multiple sources! Merge the source tags to highlight this cross-reference.
        const existing = uniqueMatchesMap.get(sig)!;
        if (!existing.sourceApi.includes(match.sourceApi)) {
          existing.sourceApi += ` & ${match.sourceApi}`;
        }
      } else {
        uniqueMatchesMap.set(sig, match);
      }
    }
    
    const uniqueRawData = Array.from(uniqueMatchesMap.values());

    // Separate by source type for interleaving
    const crossReferencedData = uniqueRawData.filter(m => m.sourceApi.includes('&'));
    const csvData = uniqueRawData.filter(m => (m.sourceApi.includes('CSV') || m.sourceApi.includes('Manual')) && !m.sourceApi.includes('&'));
    const apiData = uniqueRawData.filter(m => !m.sourceApi.includes('CSV') && !m.sourceApi.includes('Manual') && !m.sourceApi.includes('&'));
    
    const sample: typeof uniqueRawData = [];
    const SAMPLE_LIMIT = 150;
    
    // Priority 1: Matches verified by multiple sources
    for (const m of crossReferencedData) {
      if (sample.length < SAMPLE_LIMIT) sample.push(m);
    }
    
    // Priority 2: Interleave the rest to ensure a rich mix of CSV and API
    let i = 0, j = 0;
    while (sample.length < SAMPLE_LIMIT && (i < csvData.length || j < apiData.length)) {
      if (i < csvData.length) sample.push(csvData[i++]);
      if (sample.length >= SAMPLE_LIMIT) break;
      if (j < apiData.length) sample.push(apiData[j++]);
    }
    
    const matchSummary = sample.map((m, idx) => {
      const odds = m.odds as any;
      const dateStr = m.matchDate ? m.matchDate.toISOString().split('T').join(' ').substring(0, 16) : 'Unknown';
      return `${idx + 1}. ${m.homeTeam} vs ${m.awayTeam} [${m.league}] | H:${odds?.home ?? '?'} D:${odds?.draw ?? '?'} A:${odds?.away ?? '?'} | Date: ${dateStr} | Source: ${m.sourceApi}`;
    }).join('\n');

    const processorPrompt = this.config.systemPrompt
      || "You are an expert football data analyst. Analyze the following match data and provide comprehensive betting insights.";

    const userContent = `${processorPrompt}

### 🧠 SYSTEM MEMORY (PREVIOUS ANALYSIS):
${lastIntelligence?.summary || "No prior intelligence found."}

### 🆕 NEW MATCH DATA TO ANALYZE (COMBINED SOURCES):
TOTAL MATCHES: ${uniqueRawData.length} (Deduplicated)
SAMPLE OF MATCHES (TOP ${SAMPLE_LIMIT} MIXED CSV & API):
${matchSummary}

### 🎯 INSTRUCTIONS:
Using the **System Memory** for context and the **New Match Data** for current opportunities, provide a "Master Class" Intelligence Report in Markdown. 

#### 📊 STRUCTURE YOUR REPORT AS FOLLOWS:

1. **KEY MARKET TRENDS ACROSS MATCHES**
   - **Odds Uniformity & Market Clarity**: Analyze if odds are balanced or skewed. Identify high draw probabilities or clear favorites.
   - **League-Specific Observations**: Group trends by league (e.g. Liga MX, Botola Pro, etc.).
   - **Notable Odds Patterns**: Highlight specific odds (Over 2.5, BTTS) and their implied probabilities.

2. **LEAGUE-BY-LEAGUE BREAKDOWN**
   - **High-Confidence Leagues**: Where favorites are most likely to deliver.
   - **Low-Confidence Leagues**: High draw risk or unpredictable markets.
   - **Goal Expectations**: Probability of BTTS and Over/Under per league based on the data.

3. **TOP 15 RECOMMENDED BETS (Divided into Tiers)**
   - **VIP (Top 3)**: The absolute best value picks with highest confidence (85%+).
   - **Premium (Next 7)**: Strong picks with medium/high confidence (75-84%).
   - **General (Remaining 5)**: Solid value picks with medium confidence (70-74%).
   *For each bet, include a Markdown table or clean list with: Match, League, Date/Time, Market, Odds, Confidence Score (0-100), Risk Level, and Detailed Reasoning.*

4. **OVERALL DATA QUALITY ASSESSMENT**
   - Strengths and weaknesses of the current data sample.
   - Recommendations for improvement (e.g. cross-referencing sources).

5. **FINAL SUMMARY & BETTING STRATEGY**
   - Best markets to target for the current period.
   - Leagues/Teams to avoid.
   - Strategic advice for maximizing profit.

#### 📝 FORMATTING RULES:
- Use clear **Markdown tables** for data breakdowns and recommendations.
- Use **bold text** for key insights and headers.
- Ensure the tone is professional, analytical, and highly data-driven.
- **DIVERSITY**: Do not just pick "Home Win". Explore BTTS, Over/Under, and Double Chance.
- **CONTRAST**: If a match has data from both CSV and API, highlight any discrepancies or reinforcements in the reasoning.`;

    // 4. Use AI to generate insights
    let aiSummary = '';

    const result = await this.aiFactory.process(sample, userContent);
    if (result.success && result.summary && result.summary.length > 100) {
      aiSummary = result.summary;
      console.log(`Processor Agent: AI analysis successful. Summary length: ${aiSummary.length}`);
    } else {
      // Throw an error to ensure we NEVER fail silently with a fallback. AI is strictly required.
      throw new Error(`AI processing failed or returned empty summary: ${result.summary}`);
    }

    // 5. Build a compact structuredData snapshot (just the key fields, max 500 records)
    const structuredSnapshot = uniqueRawData.slice(0, 500).map(m => {
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

    // 6. Save processed intelligence record
    await prisma.processedData.create({
      data: {
        matchDate: new Date(),
        homeTeam: "Intelligence Summary",
        awayTeam: `Analysis of ${uniqueRawData.length} unique matches`,
        league: "Global Intelligence",
        summary: aiSummary,
        structuredData: structuredSnapshot as any
      }
    });

    console.log(`Processor Agent: Saved AI intelligence report. Unique Records: ${uniqueRawData.length}`);
    return uniqueRawData.length;
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

    // Bulk insert for speed
    const { count } = await prisma.scrapedData.createMany({
      data: parsed.matches.map((m: any) => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league || "Unknown",
        matchDate: m.matchDate ? new Date(m.matchDate) : null,
        odds: m.odds || {},
        sourceApi: "Manual Import",
      }))
    });

    return this.generateImportAnalysis(parsed.matches, count);
  }

  async importCSVData(csvText: string): Promise<any> {
    console.log("Processor Agent: Processing complex CSV data...");
    const lines = csvText.trim().split('\n');
    const matches: any[] = [];
    
    let currentLeague = "Unknown";
    let lastMatch: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map(c => c.trim());
      
      // Detect and skip headers
      if (cols[0] === 'DateTime' || cols[1] === 'EventName' || cols[2] === 'Code') continue;

      // Detect League Row (all columns usually repeat the league name)
      if (cols.length > 5 && cols[0] === cols[1] && cols[1] === cols[2]) {
        currentLeague = cols[0];
        continue;
      }

      // Detect Extension Row (starts with empty columns, usually for extra markets like +3.5)
      if (!cols[0] && !cols[1] && lastMatch) {
        // Line 15, 16, 17 are Goals Line, Under, Over
        if (cols[15] && cols[16] && cols[17]) {
          const lineVal = cols[15];
          const under = parseFloat(cols[16]);
          const over = parseFloat(cols[17]);
          
          if (lineVal.includes('2.5')) {
            lastMatch.odds.over25 = over;
          }
          // Store all goals lines in rawStats
          if (!lastMatch.rawStats.allGoals) lastMatch.rawStats.allGoals = [];
          lastMatch.rawStats.allGoals.push({ line: lineVal, under, over });
        }
        continue;
      }

      // Detect Match Row (starts with date/time)
      if (cols[0] && (cols[0].includes('/') || cols[0].includes('-')) && cols[0].includes(':')) {
        const dateTime = cols[0];
        const eventName = cols[1]; 
        
        let homeTeam = "Unknown";
        let awayTeam = "Unknown";

        if (eventName.includes(' v ')) {
          [homeTeam, awayTeam] = eventName.split(' v ');
        } else if (eventName.includes(' vs ')) {
          [homeTeam, awayTeam] = eventName.split(' vs ');
        } else if (eventName.includes(' - ')) {
          [homeTeam, awayTeam] = eventName.split(' - ');
        } else {
          homeTeam = eventName;
        }

        // Mapping based on study of the sample
        const ftHome = parseFloat(cols[3]) || 0;
        const ftDraw = parseFloat(cols[4]) || 0;
        const ftAway = parseFloat(cols[5]) || 0;
        
        // Skip rows with no valid teams or no odds at all
        if (homeTeam === "Unknown" || (isNaN(ftHome) && isNaN(ftDraw) && isNaN(ftAway)) || (ftHome === 0 && ftDraw === 0 && ftAway === 0)) {
          console.log(`Skipping irrelevant or empty row: ${homeTeam} vs ${awayTeam}`);
          continue;
        }

        const htHome = parseFloat(cols[7]) || 0;
        const htDraw = parseFloat(cols[8]) || 0;
        const htAway = parseFloat(cols[9]) || 0;

        const shHome = parseFloat(cols[11]) || 0;
        const shDraw = parseFloat(cols[12]) || 0;
        const shAway = parseFloat(cols[13]) || 0;

        const goalLine = cols[15] || "";
        const goalUnder = parseFloat(cols[16]) || 0;
        const goalOver = parseFloat(cols[17]) || 0;

        const dcHD = parseFloat(cols[19]) || 0;
        const dcDA = parseFloat(cols[20]) || 0;
        const dcHA = parseFloat(cols[21]) || 0;

        // BTTS Yes/No are usually near the end
        // In the sample: ...,69620.0,1.9,1.65,69622.0,69617.0,69609.0,69621.0,69610.0
        // If cols[23] and cols[24] are small numbers, they might be BTTS
        const bttsYes = parseFloat(cols[27]) || parseFloat(cols[23]) || 0;
        const bttsNo = parseFloat(cols[28]) || parseFloat(cols[24]) || 0;

        const standardOdds = {
          home: ftHome,
          draw: ftDraw,
          away: ftAway,
          btts: bttsYes,
          over25: goalLine.includes('2.5') ? goalOver : 0
        };

        const rawStats = {
          ft: { home: ftHome, draw: ftDraw, away: ftAway },
          ht: { home: htHome, draw: htDraw, away: htAway },
          sh: { home: shHome, draw: shDraw, away: shAway },
          goals: { line: goalLine, under: goalUnder, over: goalOver },
          dc: { hd: dcHD, da: dcDA, ha: dcHA },
          btts: { yes: bttsYes, no: bttsNo }
        };

        const match = {
          homeTeam,
          awayTeam,
          league: currentLeague,
          matchDate: parseCSVDate(dateTime),
          odds: standardOdds,
          rawStats: rawStats,
          sourceApi: "CSV Import"
        };

        matches.push(match);
        lastMatch = match;
      }
    }

    // Bulk insert for speed and to avoid timeouts
    const { count } = await prisma.scrapedData.createMany({
      data: matches.map(m => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        matchDate: m.matchDate,
        odds: m.odds as any,
        rawStats: m.rawStats as any,
        sourceApi: m.sourceApi,
      }))
    });

    return {
      success: true,
      count: count,
      analysis: `### ✅ Import Successful\n\nSuccessfully imported **${count}** matches from CSV into the system intelligence database. \n\n*Note: AI-powered strategic analysis was skipped to ensure maximum import speed and prevent server timeouts.*`,
      matches: matches.slice(0, 5) // Return small sample to frontend
    };
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
 * Parse date strings like "05/05/2026 16:00" or ISO formats
 */
function parseCSVDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  try {
    // Handle DD/MM/YYYY HH:mm
    if (dateStr.includes('/') && dateStr.includes(':')) {
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      // Month is 0-indexed in JS Date
      const d = new Date(year, month - 1, day, hour, minute);
      if (!isNaN(d.getTime())) return d;
    }
    
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) {
    return new Date();
  }
}

/**
 * Generate a unique signature for a match to handle deduplication 
 * across different APIs and CSV formats.
 */
function getMatchSignature(m: any): string {
  // Extract only alphanumeric characters and take first 10 chars
  const normalize = (name: string) => {
    return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
  };
  
  // Group by day to handle slight time variations
  const dateStr = m.matchDate ? `${m.matchDate.getMonth()}-${m.matchDate.getDate()}` : 'unknown';
  
  return `${normalize(m.homeTeam)}-${normalize(m.awayTeam)}-${dateStr}`;
}

