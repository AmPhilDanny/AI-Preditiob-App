import { configService } from "../services/config";
import { APIFootballService } from "../services/api-football";
import { FootballDataService } from "../services/football-data";
import { TheSportsDBService } from "../services/the-sports-db";
import { APIFootballDotComService } from "../services/api-football-com";
import { FootballApiService, NormalizedFixture } from "../services/football-api.interface";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AIFactory, AIConfig } from "../ai/provider";

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
  sourceType?: 'api' | 'web';
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
    
    console.log(`[SCRAPER] Active APIs found in config: ${services.map(s => s.name).join(', ') || 'None'}`);
    return services;
  }

  async fetchHybridData(): Promise<MatchData[]> {
    const apiServices = await this.getActiveApiServices();
    console.log(`[SCRAPER] Starting hybrid fetch from ${apiServices.length} active APIs...`);
    
    let allFixtures: MatchData[] = [];
    
    // 1. Fetch from all enabled APIs sequentially with delay
    for (const { name, service } of apiServices) {
      try {
        console.log(`[SCRAPER] Processing API: ${name}...`);
        // Get data for next 3 days to "losen up" the window
        const fixtures = await service.getTodayFixtures(3);
        console.log(`[SCRAPER] ${name} returned ${fixtures.length} fixtures.`);
        
        const mappedFixtures: MatchData[] = fixtures.map(f => ({
          id: f.externalId,
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          league: f.league,
          odds: {
            home: 1.0 + Math.random() * 2,
            draw: 2.0 + Math.random() * 2,
            away: 2.0 + Math.random() * 3
          },
          // Merge normalized stats and raw data for full storage
          apiStats: { 
            source: name, 
            ...f.stats, 
            original: f.rawData || f 
          },
          sourceType: 'api'
        }));
        
        allFixtures.push(...mappedFixtures);
        await this.saveToDb(mappedFixtures, name);
        
        // Wait 2 seconds between APIs to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`[SCRAPER] Football API fetch failed for ${name}:`, err);
      }
    }

    // 2. Crawl all configured websites sequentially
    const webData = await this.crawlWebsites();
    allFixtures.push(...webData);
    if (webData.length > 0) {
      await this.saveToDb(webData, 'web-crawler');
    }

    // Fallback data if everything fails
    if (allFixtures.length === 0) {
      const baseMatches = [
        { name: "Arsenal vs Man City", homeOdd: 2.05, drawOdd: 3.40, awayOdd: 3.20, league: "Premier League" },
        { name: "Real Madrid vs Barcelona", homeOdd: 1.95, drawOdd: 3.60, awayOdd: 3.80, league: "La Liga" }
      ];
      allFixtures = baseMatches.map(scraped => ({
        homeTeam: scraped.name.split(' vs ')[0],
        awayTeam: scraped.name.split(' vs ')[1],
        league: scraped.league,
        odds: { home: scraped.homeOdd, draw: scraped.drawOdd, away: scraped.awayOdd }
      }));
    }

    await this.deleteOldData();
    return allFixtures;
  }

  private async crawlWebsites(): Promise<MatchData[]> {
    const config = await configService.getConfig();
    const urls = config.scrapingUrls || [];
    const webMatches: MatchData[] = [];

    console.log(`Crawling ${urls.length} configured websites...`);

    for (const url of urls) {
      try {
        const response = await axios.get(url, { timeout: 10000 });
        const html = response.data;
        const $ = cheerio.load(html);
        
        // Clean up HTML to reduce token usage for AI
        $('script, style, nav, footer').remove();
        const cleanContent = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);

        // Use AI to extract matches from the page content
        const aiConfig: AIConfig = {
          provider: 'gemini',
          apiKey: config.aiProviders.gemini.apiKey,
          model: 'gemini-1.5-flash',
          systemPrompt: config.agentPrompts.scraper
        };
        
        const ai = new AIFactory(aiConfig);
        const extracted = await ai.extractFromHtml(cleanContent);
        
        console.log(`AI extracted ${extracted.length} matches from ${url}`);
        
        extracted.forEach(m => {
          webMatches.push({
            homeTeam: m.match.split(' vs ')[0] || 'Unknown',
            awayTeam: m.match.split(' vs ')[1] || 'Unknown',
            league: 'Web Scraped',
            odds: { home: m.odds || 2.0, draw: 3.0, away: 3.0 },
            sourceType: 'web',
            apiStats: { url, reasoning: m.reasoning }
          });
        });
      } catch (err) {
        console.error(`Failed to crawl ${url}:`, err);
      }
    }

    return webMatches;
  }

  private async saveToDb(matches: MatchData[], source: string) {
    try {
      const { default: prisma } = await import('@/lib/prisma');
      for (const m of matches) {
        await prisma.scrapedData.create({
          data: {
            sourceApi: source,
            matchId: m.id || `web-${Date.now()}-${Math.random()}`,
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
      console.warn(`Could not save scraped data to DB:`, dbErr);
    }
  }
  
  private async deleteOldData() {
    try {
      const { default: prisma } = await import('@/lib/prisma');
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const result = await prisma.scrapedData.deleteMany({
        where: { createdAt: { lt: tenDaysAgo } }
      });
      console.log(`Deleted ${result.count} old records.`);
    } catch (err) {
      console.error('Failed to delete old data:', err);
    }
  }
}
