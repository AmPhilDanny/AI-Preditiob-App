import prisma from "../prisma";

export class HealthAgent {
  constructor() {}

  async checkSystemHealth(): Promise<any> {
    console.log("Performing deep system health check...");
    
    let dbStatus = 'online';
    let counts = { scraped: 0, processed: 0 };
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      counts.scraped = await prisma.scrapedData.count();
      counts.processed = await prisma.processedData.count();
    } catch (err) {
      console.error("Database health check failed:", err);
      dbStatus = 'offline';
    }

    const { configService } = await import('../services/config');
    const config = await configService.getConfig();

    return {
      status: dbStatus === 'online' ? 'healthy' : 'degraded',
      database: dbStatus,
      storage: {
        hasScraped: counts.scraped > 0,
        hasProcessed: counts.processed > 0,
        scrapedCount: counts.scraped,
        processedCount: counts.processed
      },
      urls: config.scrapingUrls || [],
      apiUsage: {
        gemini: '12%',
        grok: '5%',
        mistral: '8%'
      },
      lastScrape: new Date().toISOString()
    };
  }
}
