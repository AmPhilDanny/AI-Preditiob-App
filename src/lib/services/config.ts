import prisma from "../prisma";

export interface SystemConfig {
  scrapingUrls: string[];
  footballApis: {
    api1: { apiKey: string; enabled: boolean };
    api2: { apiKey: string; enabled: boolean };
    api3: { apiKey: string; enabled: boolean };
  };
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
      return {
        scrapingUrls: ['https://www.bet365.com', 'https://www.betway.com'],
        footballApis: {
          api1: { apiKey: '', enabled: true },
          api2: { apiKey: '', enabled: false },
          api3: { apiKey: '', enabled: false },
        },
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
      footballApis: {
        api1: { apiKey: dbConfig.footballApiKey1 || '', enabled: dbConfig.footballApi1Enabled },
        api2: { apiKey: dbConfig.footballApiKey2 || '', enabled: dbConfig.footballApi2Enabled },
        api3: { apiKey: dbConfig.footballApiKey3 || '', enabled: dbConfig.footballApi3Enabled },
      },
      aiProviders: {
        gemini: { 
          apiKey: dbConfig.geminiApiKey || '', 
          enabled: dbConfig.geminiEnabled, 
          status: dbConfig.geminiEnabled ? 'online' : 'offline' 
        },
        grok: { 
          apiKey: dbConfig.grokApiKey || '', 
          enabled: dbConfig.grokEnabled, 
          status: dbConfig.grokEnabled ? 'online' : 'offline' 
        },
        mistral: { 
          apiKey: dbConfig.mistralApiKey || '', 
          enabled: dbConfig.mistralEnabled, 
          status: dbConfig.mistralEnabled ? 'online' : 'offline' 
        },
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
        
        footballApiKey1: newConfig.footballApis?.api1?.apiKey,
        footballApi1Enabled: newConfig.footballApis?.api1?.enabled,
        footballApiKey2: newConfig.footballApis?.api2?.apiKey,
        footballApi2Enabled: newConfig.footballApis?.api2?.enabled,
        footballApiKey3: newConfig.footballApis?.api3?.apiKey,
        footballApi3Enabled: newConfig.footballApis?.api3?.enabled,

        geminiApiKey: newConfig.aiProviders?.gemini?.apiKey,
        geminiEnabled: newConfig.aiProviders?.gemini?.enabled,
        grokApiKey: newConfig.aiProviders?.grok?.apiKey,
        grokEnabled: newConfig.aiProviders?.grok?.enabled,
        mistralApiKey: newConfig.aiProviders?.mistral?.apiKey,
        mistralEnabled: newConfig.aiProviders?.mistral?.enabled,
        
        analystPrompt: newConfig.agentPrompts?.analyst,
        scraperPrompt: newConfig.agentPrompts?.scraper,
      },
      create: {
        id: 'default',
        scrapingUrls: newConfig.scrapingUrls || [],
        
        footballApiKey1: newConfig.footballApis?.api1?.apiKey || '',
        footballApi1Enabled: newConfig.footballApis?.api1?.enabled ?? true,
        footballApiKey2: newConfig.footballApis?.api2?.apiKey || '',
        footballApi2Enabled: newConfig.footballApis?.api2?.enabled ?? false,
        footballApiKey3: newConfig.footballApis?.api3?.apiKey || '',
        footballApi3Enabled: newConfig.footballApis?.api3?.enabled ?? false,

        geminiApiKey: newConfig.aiProviders?.gemini?.apiKey || '',
        geminiEnabled: newConfig.aiProviders?.gemini?.enabled ?? true,
        grokApiKey: newConfig.aiProviders?.grok?.apiKey || '',
        grokEnabled: newConfig.aiProviders?.grok?.enabled ?? false,
        mistralApiKey: newConfig.aiProviders?.mistral?.apiKey || '',
        mistralEnabled: newConfig.aiProviders?.mistral?.enabled ?? false,

        analystPrompt: newConfig.agentPrompts?.analyst || '',
        scraperPrompt: newConfig.agentPrompts?.scraper || '',
      }
    });
    return this.getConfig();
  }
}

export const configService = new ConfigService();
