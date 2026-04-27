import { APIFootballService } from "../services/api-football";

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
  private apiService?: APIFootballService;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiService = new APIFootballService(apiKey);
    }
  }

  async fetchHybridData(bettingUrl: string): Promise<MatchData[]> {
    console.log("Starting hybrid data collection...");
    
    let fixtures: any[] = [];
    if (this.apiService) {
      console.log("Fetching structured data from API-Football...");
      const response = await this.apiService.getTodayFixtures();
      fixtures = response.response || [];
    }

    console.log(`Scraping real-time odds from: ${bettingUrl}`);
    // Mock scraping logic - in production this would use Playwright
    const scrapedMatches = [
      { name: "Arsenal vs Man City", homeOdd: 2.05, drawOdd: 3.40, awayOdd: 3.20 },
      { name: "Real Madrid vs Barcelona", homeOdd: 1.95, drawOdd: 3.60, awayOdd: 3.80 }
    ];

    // Merge API data with Scraped data
    return scrapedMatches.map(scraped => {
      const apiMatch = fixtures.find(f => 
        `${f.teams.home.name} vs ${f.teams.away.name}` === scraped.name
      );

      return {
        homeTeam: scraped.name.split(' vs ')[0],
        awayTeam: scraped.name.split(' vs ')[1],
        league: apiMatch?.league?.name || "Unknown",
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
