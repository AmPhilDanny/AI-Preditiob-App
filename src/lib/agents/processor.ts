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
    // We send the raw data to Gemini to get a professional betting analysis summary
    const result = await this.aiFactory.process(rawData);

    // 3. Save processed data
    // We store the analysis as a high-level intelligence entry for today
    await prisma.processedData.create({
      data: {
        matchDate: new Date(),
        homeTeam: "Daily Analysis",
        awayTeam: "All Matches",
        league: "Global Intelligence",
        summary: result.summary,
        structuredData: rawData as any // Keep raw data for retrieval in structured format
      }
    });

    console.log(`Processor Agent: Successfully organized ${rawData.length} records into daily intelligence.`);
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
