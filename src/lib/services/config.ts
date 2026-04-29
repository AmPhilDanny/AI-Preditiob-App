import prisma from "../prisma";

export interface SystemConfig {
  scrapingUrls: string[];
  footballApis: {
    api1: { apiKey: string; enabled: boolean };
    api2: { apiKey: string; enabled: boolean };
    api3: { apiKey: string; enabled: boolean };
    api4: { apiKey: string; enabled: boolean };
  };
  aiProviders: {
    gemini: { apiKey: string; enabled: boolean };
    grok: { apiKey: string; enabled: boolean };
    mistral: { apiKey: string; enabled: boolean };
  };
  aiAnalysisEnabled: boolean;
  predictionThreshold: number;
  agentPrompts: {
    analyst: string;
    scraper: string;
  };
}

class ConfigService {
  private static instance: ConfigService;

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async getConfig(): Promise<SystemConfig> {
    try {
      const config = await prisma.systemConfig.findFirst();
      
      if (!config) {
        // No config in DB yet — create the default row so saves work correctly
        const defaults = this.getDefaultConfig();
        try {
          await prisma.systemConfig.create({
            data: {
              id: 'default',
              scrapingUrls: defaults.scrapingUrls,
              footballApiKey1: defaults.footballApis.api1.apiKey,
              footballApi1Enabled: defaults.footballApis.api1.enabled,
              footballApiKey2: defaults.footballApis.api2.apiKey,
              footballApi2Enabled: defaults.footballApis.api2.enabled,
              footballApiKey3: defaults.footballApis.api3.apiKey,
              footballApi3Enabled: defaults.footballApis.api3.enabled,
              footballApiKey4: defaults.footballApis.api4.apiKey,
              footballApi4Enabled: defaults.footballApis.api4.enabled,
              geminiApiKey: defaults.aiProviders.gemini.apiKey,
              geminiEnabled: defaults.aiProviders.gemini.enabled,
              grokApiKey: defaults.aiProviders.grok.apiKey,
              grokEnabled: defaults.aiProviders.grok.enabled,
              mistralApiKey: defaults.aiProviders.mistral.apiKey,
              mistralEnabled: defaults.aiProviders.mistral.enabled,
              aiAnalysisEnabled: defaults.aiAnalysisEnabled,
              predictionThreshold: defaults.predictionThreshold,
              analystPrompt: defaults.agentPrompts.analyst,
              scraperPrompt: defaults.agentPrompts.scraper,
            }
          });
        } catch (createError) {
          console.warn('Could not create default config row:', createError);
        }
        return defaults;
      }

      return {
        scrapingUrls: config.scrapingUrls,
        footballApis: {
          api1: { apiKey: config.footballApiKey1 || '', enabled: config.footballApi1Enabled },
          api2: { apiKey: config.footballApiKey2 || '', enabled: config.footballApi2Enabled },
          api3: { apiKey: config.footballApiKey3 || '', enabled: config.footballApi3Enabled },
          api4: { apiKey: config.footballApiKey4 || '', enabled: config.footballApi4Enabled },
        },
        aiProviders: {
          gemini: { apiKey: config.geminiApiKey || '', enabled: config.geminiEnabled },
          grok: { apiKey: config.grokApiKey || '', enabled: config.grokEnabled },
          mistral: { apiKey: config.mistralApiKey || '', enabled: config.mistralEnabled },
        },
        aiAnalysisEnabled: config.aiAnalysisEnabled,
        predictionThreshold: config.predictionThreshold,
        agentPrompts: {
          analyst: config.analystPrompt || '',
          scraper: config.scraperPrompt || '',
        }
      };
    } catch (error) {
      console.error("Failed to fetch config from DB:", error);
      return this.getDefaultConfig();
    }
  }

  async updateConfig(updates: Partial<SystemConfig>) {
    const current = await this.getConfig();

    // Deep merge nested objects to avoid wiping existing keys
    const merged: SystemConfig = {
      ...current,
      ...updates,
      footballApis: {
        api1: { ...current.footballApis.api1, ...updates.footballApis?.api1 },
        api2: { ...current.footballApis.api2, ...updates.footballApis?.api2 },
        api3: { ...current.footballApis.api3, ...updates.footballApis?.api3 },
        api4: { ...current.footballApis.api4, ...updates.footballApis?.api4 },
      },
      aiProviders: {
        gemini:  { ...current.aiProviders.gemini,  ...updates.aiProviders?.gemini },
        grok:    { ...current.aiProviders.grok,    ...updates.aiProviders?.grok },
        mistral: { ...current.aiProviders.mistral, ...updates.aiProviders?.mistral },
      },
      agentPrompts: {
        analyst: updates.agentPrompts?.analyst ?? current.agentPrompts.analyst,
        scraper: updates.agentPrompts?.scraper ?? current.agentPrompts.scraper,
      },
      scrapingUrls: updates.scrapingUrls ?? current.scrapingUrls,
    };

    return prisma.systemConfig.upsert({
      where: { id: 'default' },
      update: {
        scrapingUrls: merged.scrapingUrls,
        footballApiKey1: merged.footballApis.api1.apiKey,
        footballApi1Enabled: merged.footballApis.api1.enabled,
        footballApiKey2: merged.footballApis.api2.apiKey,
        footballApi2Enabled: merged.footballApis.api2.enabled,
        footballApiKey3: merged.footballApis.api3.apiKey,
        footballApi3Enabled: merged.footballApis.api3.enabled,
        footballApiKey4: merged.footballApis.api4.apiKey,
        footballApi4Enabled: merged.footballApis.api4.enabled,
        geminiApiKey: merged.aiProviders.gemini.apiKey,
        geminiEnabled: merged.aiProviders.gemini.enabled,
        grokApiKey: merged.aiProviders.grok.apiKey,
        grokEnabled: merged.aiProviders.grok.enabled,
        mistralApiKey: merged.aiProviders.mistral?.apiKey || '',
        mistralEnabled: merged.aiProviders.mistral?.enabled || false,
        aiAnalysisEnabled: merged.aiAnalysisEnabled,
        predictionThreshold: merged.predictionThreshold,
        analystPrompt: merged.agentPrompts.analyst,
        scraperPrompt: merged.agentPrompts.scraper,
      },
      create: {
        id: 'default',
        scrapingUrls: merged.scrapingUrls,
        footballApiKey1: merged.footballApis.api1.apiKey,
        footballApi1Enabled: merged.footballApis.api1.enabled,
        footballApiKey2: merged.footballApis.api2.apiKey,
        footballApi2Enabled: merged.footballApis.api2.enabled,
        footballApiKey3: merged.footballApis.api3.apiKey,
        footballApi3Enabled: merged.footballApis.api3.enabled,
        footballApiKey4: merged.footballApis.api4.apiKey,
        footballApi4Enabled: merged.footballApis.api4.enabled,
        geminiApiKey: merged.aiProviders.gemini.apiKey,
        geminiEnabled: merged.aiProviders.gemini.enabled,
        grokApiKey: merged.aiProviders.grok.apiKey,
        grokEnabled: merged.aiProviders.grok.enabled,
        mistralApiKey: merged.aiProviders.mistral?.apiKey || '',
        mistralEnabled: merged.aiProviders.mistral?.enabled || false,
        aiAnalysisEnabled: merged.aiAnalysisEnabled,
        predictionThreshold: merged.predictionThreshold,
        analystPrompt: merged.agentPrompts.analyst,
        scraperPrompt: merged.agentPrompts.scraper,
      },
    });
  }

  private getDefaultConfig(): SystemConfig {
    return {
      scrapingUrls: [],
      footballApis: {
        api1: { apiKey: '', enabled: true },
        api2: { apiKey: '', enabled: false },
        api3: { apiKey: '', enabled: false },
        api4: { apiKey: '', enabled: false },
      },
      aiProviders: {
        gemini: { apiKey: '', enabled: true },
        grok: { apiKey: '', enabled: false },
        mistral: { apiKey: '', enabled: false },
      },
      aiAnalysisEnabled: true,
      predictionThreshold: 75,
      agentPrompts: {
        analyst: 'You are a professional football betting analyst...',
        scraper: 'Filter for today matches only...'
      }
    };
  }
}

export const configService = ConfigService.getInstance();
