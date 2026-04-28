import { configService } from "../services/config";
import { APIFootballService } from "../services/api-football";
import { FootballDataService } from "../services/football-data";
import { TheSportsDBService } from "../services/the-sports-db";
import { APIFootballDotComService } from "../services/api-football-com";
import { FootballApiService, NormalizedFixture } from "../services/football-api.interface";

export interface MatchData {
  id?: string;
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

  private async getActiveApiService(): Promise<FootballApiService | null> {
    const config = await configService.getConfig();
    
    if (config.footballApis.api1.enabled && config.footballApis.api1.apiKey) {
      return new APIFootballService(config.footballApis.api1.apiKey);
    }
    if (config.footballApis.api2.enabled && config.footballApis.api2.apiKey) {
      return new FootballDataService(config.footballApis.api2.apiKey);
    }
    if (config.footballApis.api3.enabled && config.footballApis.api3.apiKey) {
      return new TheSportsDBService(config.footballApis.api3.apiKey);
    }
    if (config.footballApis.api4.enabled && config.footballApis.api4.apiKey) {
      return new APIFootballDotComService(config.footballApis.api4.apiKey);
    }
    
    return null;
  }

  async fetchHybridData(): Promise<MatchData[]> {
    const apiService = await this.getActiveApiService();
    
    console.log(`Gathering data and sync with external API...`);
    
    let fixtures: NormalizedFixture[] = [];
    if (apiService) {
      try {
        fixtures = await apiService.getTodayFixtures();
      } catch (err) {
        console.error("Football API fetch failed:", err);
      }
    }

    const baseMatches = [
      { name: "Arsenal vs Man City", homeOdd: 2.05, drawOdd: 3.40, awayOdd: 3.20, league: "Premier League" },
      { name: "Real Madrid vs Barcelona", homeOdd: 1.95, drawOdd: 3.60, awayOdd: 3.80, league: "La Liga" },
      { name: "Liverpool vs Chelsea", homeOdd: 1.85, drawOdd: 3.50, awayOdd: 4.20, league: "Premier League" },
      { name: "PSG vs Marseille", homeOdd: 1.45, drawOdd: 4.50, awayOdd: 6.50, league: "Ligue 1" },
      { name: "Inter vs Milan", homeOdd: 2.20, drawOdd: 3.20, awayOdd: 3.40, league: "Serie A" }
    ];

    if (fixtures.length > 0) {
      return fixtures.map(f => ({
        id: f.externalId,
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        league: f.league,
        odds: {
          home: 1.0 + Math.random() * 2,
          draw: 2.0 + Math.random() * 2,
          away: 2.0 + Math.random() * 3
        },
        apiStats: f
      }));
    }

    return baseMatches.map(scraped => ({
      homeTeam: scraped.name.split(' vs ')[0],
      awayTeam: scraped.name.split(' vs ')[1],
      league: scraped.league,
      odds: {
        home: scraped.homeOdd,
        draw: scraped.drawOdd,
        away: scraped.awayOdd
      }
    }));
  }
}
