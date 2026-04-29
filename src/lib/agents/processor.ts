import { AIFactory, AIConfig } from "../ai/provider";
import prisma from "../prisma";

export class ProcessorAgent {
  private aiFactory: AIFactory;

  constructor(config: AIConfig) {
    this.aiFactory = new AIFactory(config);
  }

  async processRawData(days: number = 1): Promise<number> {
    console.log(`Processor Agent: Starting data organization for the last ${days} days...`);

    // 1. Fetch raw scraped data
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const rawData = await prisma.scrapedData.findMany({
      where: {
        createdAt: {
          gte: dateLimit
        }
      }
    });

    if (rawData.length === 0) {
      console.log("Processor Agent: No raw data found to process.");
      return 0;
    }

    // 2. Use AI to organize data
    // In a real scenario, we might chunk this data to avoid context window limits
    const result = await this.aiFactory.process(rawData);

    // 3. Save processed data
    // For simplicity, we create one entry for the batch, but in reality, 
    // we might want to split it by league or match.
    await prisma.processedData.create({
      data: {
        matchDate: new Date(),
        homeTeam: "Multiple Teams",
        awayTeam: "Multiple Teams",
        league: "Various",
        summary: result.summary,
        structuredData: result.structuredData
      }
    });

    console.log(`Processor Agent: Successfully organized ${rawData.length} records.`);
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
}
