import prisma from "../prisma";

export interface SystemConfig {
  scrapingUrls: string[];
  footballApiKey: string;
  aiProviders: {
    gemini: { apiKey: string; enabled: boolean; status: 'online' | 'offline' | 'error' };
    grok: { apiKey: string; enabled: boolean; status: 'online' | 'offline' | 'error' };
    mistral: { apiKey: string; enabled: boolean; status: 'online' | 'offline' | 'error' };
  };
  agentPrompts: {
    analyst: string;
    scraper: string;
  };
}

class ConfigService {
  async getConfig(): Promise<SystemConfig> {
    const dbConfig = await prisma.systemConfig.findUnique({
      where: { id: 'default' }
    });

    if (!dbConfig) {
      // Fallback or seed logic if not found
      return {
        scrapingUrls: ['https://www.bet365.com', 'https://www.betway.com'],
        footballApiKey: process.env.FOOTBALL_API_KEY || '',
        aiProviders: {
          gemini: { apiKey: process.env.GEMINI_API_KEY || '', enabled: true, status: 'online' },
          grok: { apiKey: '', enabled: false, status: 'offline' },
          mistral: { apiKey: '', enabled: false, status: 'offline' },
        },
        agentPrompts: {
          analyst: "You are an expert football analyst. Your goal is to identify low-risk outcomes and combine them into high-value slips.",
          scraper: "You are a master data gatherer. Focus on fetching real-time odds and team news."
        }
      };
    }

    return {
      scrapingUrls: dbConfig.scrapingUrls,
      footballApiKey: dbConfig.footballApiKey || '',
      aiProviders: {
        gemini: { apiKey: dbConfig.geminiApiKey || '', enabled: !!dbConfig.geminiApiKey, status: 'online' },
        grok: { apiKey: dbConfig.grokApiKey || '', enabled: !!dbConfig.grokApiKey, status: 'offline' },
        mistral: { apiKey: dbConfig.mistralApiKey || '', enabled: !!dbConfig.mistralApiKey, status: 'offline' },
      },
      agentPrompts: {
        analyst: dbConfig.analystPrompt,
        scraper: dbConfig.scraperPrompt
      }
    };
  }

  async updateConfig(newConfig: Partial<SystemConfig>) {
    await prisma.systemConfig.upsert({
      where: { id: 'default' },
      update: {
        scrapingUrls: newConfig.scrapingUrls,
        footballApiKey: newConfig.footballApiKey,
        geminiApiKey: newConfig.aiProviders?.gemini?.apiKey,
        grokApiKey: newConfig.aiProviders?.grok?.apiKey,
        mistralApiKey: newConfig.aiProviders?.mistral?.apiKey,
        analystPrompt: newConfig.agentPrompts?.analyst,
        scraperPrompt: newConfig.agentPrompts?.scraper,
      },
      create: {
        id: 'default',
        scrapingUrls: newConfig.scrapingUrls || [],
        footballApiKey: newConfig.footballApiKey,
        geminiApiKey: newConfig.aiProviders?.gemini?.apiKey,
        analystPrompt: newConfig.agentPrompts?.analyst || '',
        scraperPrompt: newConfig.agentPrompts?.scraper || '',
      }
    });
    return this.getConfig();
  }
}

export const configService = new ConfigService();
