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

  private async getActiveApiServices(): Promise<{name: string, service: FootballApiService}[]> {
    const config = await configService.getConfig();
    const services: {name: string, service: FootballApiService}[] = [];
    
    if (config.footballApis.api1.enabled && config.footballApis.api1.apiKey) {
      services.push({ name: 'api-sports.io', service: new APIFootballService(config.footballApis.api1.apiKey) });
    }
    if (config.footballApis.api2.enabled && config.footballApis.api2.apiKey) {
      services.push({ name: 'football-data.org', service: new FootballDataService(config.footballApis.api2.apiKey) });
    }
    if (config.footballApis.api3.enabled && config.footballApis.api3.apiKey) {
      services.push({ name: 'thesportsdb.com', service: new TheSportsDBService(config.footballApis.api3.apiKey) });
    }
    if (config.footballApis.api4.enabled && config.footballApis.api4.apiKey) {
      services.push({ name: 'apifootball.com', service: new APIFootballDotComService(config.footballApis.api4.apiKey) });
    }
    
    return services;
  }

  async fetchHybridData(): Promise<MatchData[]> {
    const apiServices = await this.getActiveApiServices();
    
    console.log(`Gathering data and sync with external APIs... Found ${apiServices.length} active APIs.`);
    
    let allFixtures: MatchData[] = [];
    
    for (const { name, service } of apiServices) {
      try {
        const fixtures = await service.getTodayFixtures();
        const mappedFixtures = fixtures.map(f => ({
          id: f.externalId,
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          league: f.league,
          odds: {
            home: 1.0 + Math.random() * 2,
            draw: 2.0 + Math.random() * 2,
            away: 2.0 + Math.random() * 3
          },
          apiStats: { source: name, ...f }
        }));
        
        allFixtures.push(...mappedFixtures);
        
        // Save to DB — wrapped in try/catch in case ScrapedData table isn't created yet
        try {
          const { default: prisma } = await import('@/lib/prisma');
          for (const m of mappedFixtures) {
            await prisma.scrapedData.create({
              data: {
                sourceApi: name,
                matchId: m.id,
                homeTeam: m.homeTeam,
                awayTeam: m.awayTeam,
                league: m.league,
                matchDate: new Date(),
                odds: m.odds,
                rawStats: m.apiStats
              }
            });
          }
        } catch (dbErr) {
          console.warn(`Could not save scraped data to DB (table may not exist yet):`, dbErr);
        }
      } catch (err) {
        console.error(`Football API fetch failed for ${name}:`, err);
      }
    }

    const baseMatches = [
      { name: "Arsenal vs Man City", homeOdd: 2.05, drawOdd: 3.40, awayOdd: 3.20, league: "Premier League" },
      { name: "Real Madrid vs Barcelona", homeOdd: 1.95, drawOdd: 3.60, awayOdd: 3.80, league: "La Liga" },
      { name: "Liverpool vs Chelsea", homeOdd: 1.85, drawOdd: 3.50, awayOdd: 4.20, league: "Premier League" },
      { name: "PSG vs Marseille", homeOdd: 1.45, drawOdd: 4.50, awayOdd: 6.50, league: "Ligue 1" },
      { name: "Inter vs Milan", homeOdd: 2.20, drawOdd: 3.20, awayOdd: 3.40, league: "Serie A" }
    ];

    if (allFixtures.length === 0) {
      allFixtures = baseMatches.map(scraped => ({
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

    // Auto delete data older than 10 days
    await this.deleteOldData();

    return allFixtures;
  }
  
  private async deleteOldData() {
    try {
      const { default: prisma } = await import('@/lib/prisma');
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const result = await prisma.scrapedData.deleteMany({
        where: {
          createdAt: {
            lt: tenDaysAgo
          }
        }
      });
      console.log(`Deleted ${result.count} old scraped data records.`);
    } catch (err) {
      console.error('Failed to delete old scraped data:', err);
    }
  }
}
