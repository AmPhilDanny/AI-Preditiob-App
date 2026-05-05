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
    console.log(`Processor Agent: Starting focused analysis for data imported in the last ${days} days...`);

    // 1. Fetch recently imported raw data
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const rawData = await prisma.scrapedData.findMany({
      where: {
        createdAt: {
          gte: dateLimit
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 
    });

    if (rawData.length === 0) {
      console.log(`Processor Agent: No new raw data found for the last ${days} days.`);
      return 0;
    }

    // 2. Fetch "System Memory" (previous intelligence report)
    const lastIntelligence = await prisma.processedData.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Processor Agent: Found ${rawData.length} records. Merging with system memory...`);

    // 3. Build a compact summary for AI (reduced size for speed)
    const sampleSize = Math.min(rawData.length, 50);
    const sample = rawData.slice(0, sampleSize);
    
    const matchSummary = sample.map((m, i) => {
      const odds = m.odds as any;
      return `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} [${m.league}] | H:${odds?.home ?? '?'} D:${odds?.draw ?? '?'} A:${odds?.away ?? '?'} | Imported: ${m.createdAt?.toISOString().split('T')[0]}`;
    }).join('\n');

    const processorPrompt = this.config.systemPrompt
      || "You are an expert football data analyst. Analyze the following match data and provide comprehensive betting insights.";

    const userContent = `${processorPrompt}

### 🧠 SYSTEM MEMORY (PREVIOUS ANALYSIS):
${lastIntelligence?.summary || "No prior intelligence found."}

### 🆕 NEW MATCH DATA TO ANALYZE (LAST ${days} DAYS):
TOTAL MATCHES: ${rawData.length}
SAMPLE OF MATCHES:
${matchSummary}

### 🎯 INSTRUCTIONS:
Using the **System Memory** for context and the **New Match Data** for current opportunities:
1. Identify high-value patterns emerging in today's/tomorrow's matches.
2. Compare current odds with the trends noted in previous analysis.
3. Provide a focused list of the TOP 10 recommendations for the upcoming 48 hours.
4. Highlight any major shifts in league form or market behavior.`;

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
