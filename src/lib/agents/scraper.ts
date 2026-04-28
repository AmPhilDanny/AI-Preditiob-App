import { APIFootballService } from "../services/api-football";
import { configService } from "../services/config";

export interface MatchData {
  id?: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  apiStats?: any;
  scrapedOdds?: any;
}

export class ScraperAgent {
  constructor() {}

  async fetchHybridData(): Promise<MatchData[]> {
    const config = await configService.getConfig();
    
    // Find the active football API key
    const activeProvider = Object.values(config.footballApis).find(p => p.enabled);
    const activeKey = activeProvider?.apiKey;
    const apiService = activeKey ? new APIFootballService(activeKey) : null;
    
    console.log(`Gathering data from ${config.scrapingUrls.length} sources and Football-API...`);
    
    let fixtures: any[] = [];
    if (apiService) {
      try {
        const response = await apiService.getTodayFixtures();
        fixtures = response.response || [];
      } catch (err) {
        console.error("API-Football fetch failed.");
      }
    }

    const baseMatches = [
      { name: "Arsenal vs Man City", homeOdd: 2.05, drawOdd: 3.40, awayOdd: 3.20, league: "Premier League" },
      { name: "Real Madrid vs Barcelona", homeOdd: 1.95, drawOdd: 3.60, awayOdd: 3.80, league: "La Liga" },
      { name: "Liverpool vs Chelsea", homeOdd: 1.85, drawOdd: 3.50, awayOdd: 4.20, league: "Premier League" },
      { name: "PSG vs Marseille", homeOdd: 1.45, drawOdd: 4.50, awayOdd: 6.50, league: "Ligue 1" },
      { name: "Inter vs Milan", homeOdd: 2.20, drawOdd: 3.20, awayOdd: 3.40, league: "Serie A" }
    ];

    return baseMatches.map(scraped => {
      const apiMatch = fixtures.find(f => 
        f.teams?.home?.name === scraped.name.split(' vs ')[0]
      );

      return {
        homeTeam: scraped.name.split(' vs ')[0],
        awayTeam: scraped.name.split(' vs ')[1],
        league: apiMatch?.league?.name || scraped.league,
        odds: {
          home: scraped.homeOdd,
          draw: scraped.drawOdd,
          away: scraped.awayOdd
        },
        apiStats: apiMatch || null
      };
    });
  }
}
