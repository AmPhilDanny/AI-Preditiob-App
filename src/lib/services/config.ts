import prisma from "../prisma";

export interface SystemConfig {
  scrapingUrls: string[];
  footballApis: {
    api1: { apiKey: string; enabled: boolean };
    api2: { apiKey: string; enabled: boolean };
    api3: { apiKey: string; enabled: boolean };
    api4: { apiKey: string; enabled: boolean };
    api5: { apiKey: string; enabled: boolean };
  };
  aiProviders: {
    gemini: { apiKey: string; enabled: boolean; model: string };
    grok: { apiKey: string; enabled: boolean };
    mistral: { apiKey: string; enabled: boolean; model: string };
    openrouter: { apiKey: string; enabled: boolean; model: string };
  };
  aiAnalysisEnabled: boolean;
  predictionThreshold: number;
  agentPrompts: {
    analyst: string;
    scraper: string;
    processor: string;
  };
  neuralBets: {
    url: string;
    apiKey: string;
  };
}

class ConfigService {
  private static instance: ConfigService;
  private readonly CONFIG_ID = 'default';

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async getConfig(): Promise<SystemConfig> {
    try {
      let config = await prisma.systemConfig.findUnique({
        where: { id: this.CONFIG_ID }
      });
      
      if (!config) {
        config = await prisma.systemConfig.findFirst();
      }

      if (!config) {
        const defaults = this.getDefaultConfig();
        config = await prisma.systemConfig.create({
          data: {
            id: this.CONFIG_ID,
            scrapingUrls: defaults.scrapingUrls,
            footballApiKey1: defaults.footballApis.api1.apiKey,
            footballApi1Enabled: defaults.footballApis.api1.enabled,
            footballApiKey2: defaults.footballApis.api2.apiKey,
            footballApi2Enabled: defaults.footballApis.api2.enabled,
            footballApiKey3: defaults.footballApis.api3.apiKey,
            footballApi3Enabled: defaults.footballApis.api3.enabled,
            footballApiKey4: defaults.footballApis.api4.apiKey,
            footballApi4Enabled: defaults.footballApis.api4.enabled,
            footballApiKey5: defaults.footballApis.api5.apiKey,
            footballApi5Enabled: defaults.footballApis.api5.enabled,
            geminiApiKey: defaults.aiProviders.gemini.apiKey,
            geminiEnabled: defaults.aiProviders.gemini.enabled,
            geminiModel: defaults.aiProviders.gemini.model,
            grokApiKey: defaults.aiProviders.grok.apiKey,
            grokEnabled: defaults.aiProviders.grok.enabled,
            mistralApiKey: defaults.aiProviders.mistral.apiKey,
            mistralEnabled: defaults.aiProviders.mistral.enabled,
            mistralModel: defaults.aiProviders.mistral.model,
            openrouterApiKey: defaults.aiProviders.openrouter.apiKey,
            openrouterEnabled: defaults.aiProviders.openrouter.enabled,
            openrouterModel: defaults.aiProviders.openrouter.model,
            aiAnalysisEnabled: defaults.aiAnalysisEnabled,
            predictionThreshold: defaults.predictionThreshold,
            analystPrompt: defaults.agentPrompts.analyst,
            scraperPrompt: defaults.agentPrompts.scraper,
            processorPrompt: defaults.agentPrompts.processor,
            neuralBetsUrl: defaults.neuralBets.url,
            neuralBetsApiKey: defaults.neuralBets.apiKey,
          }
        });
      }

      return {
        scrapingUrls: config.scrapingUrls,
        footballApis: {
          api1: { apiKey: config.footballApiKey1 || '', enabled: config.footballApi1Enabled },
          api2: { apiKey: config.footballApiKey2 || '', enabled: config.footballApi2Enabled },
          api3: { apiKey: config.footballApiKey3 || '', enabled: config.footballApi3Enabled },
          api4: { apiKey: config.footballApiKey4 || '', enabled: config.footballApi4Enabled },
          api5: { apiKey: (config as any).footballApiKey5 || '', enabled: (config as any).footballApi5Enabled ?? false },
        },
        aiProviders: {
          gemini: { 
            apiKey: config.geminiApiKey || '', 
            enabled: config.geminiEnabled,
            model: config.geminiModel || 'gemini-1.5-flash'
          },
          grok: { apiKey: config.grokApiKey || '', enabled: config.grokEnabled },
          mistral: { 
            apiKey: config.mistralApiKey || '', 
            enabled: config.mistralEnabled,
            model: (config as any).mistralModel || 'mistral-large-latest'
          },
          openrouter: {
            apiKey: (config as any).openrouterApiKey || '',
            enabled: (config as any).openrouterEnabled ?? false,
            model: (config as any).openrouterModel || 'google/gemini-2.0-flash-001'
          }
        },
        aiAnalysisEnabled: config.aiAnalysisEnabled,
        predictionThreshold: config.predictionThreshold,
        agentPrompts: {
          analyst: config.analystPrompt || '',
          scraper: config.scraperPrompt || '',
          processor: config.processorPrompt || '',
        },
        neuralBets: {
          url: (config as any).neuralBetsUrl || '',
          apiKey: (config as any).neuralBetsApiKey || '',
        }
      };
    } catch (error) {
      console.error("Failed to fetch config from DB:", error);
      return this.getDefaultConfig();
    }
  }

  async updateConfig(updates: Partial<SystemConfig>) {
    const current = await this.getConfig();

    const merged: SystemConfig = {
      ...current,
      ...updates,
      footballApis: {
        api1: { ...current.footballApis.api1, ...updates.footballApis?.api1 },
        api2: { ...current.footballApis.api2, ...updates.footballApis?.api2 },
        api3: { ...current.footballApis.api3, ...updates.footballApis?.api3 },
        api4: { ...current.footballApis.api4, ...updates.footballApis?.api4 },
        api5: { ...current.footballApis.api5, ...updates.footballApis?.api5 },
      },
      aiProviders: {
        gemini:  { ...current.aiProviders.gemini,  ...updates.aiProviders?.gemini },
        grok:    { ...current.aiProviders.grok,    ...updates.aiProviders?.grok },
        mistral: { ...current.aiProviders.mistral, ...updates.aiProviders?.mistral },
        openrouter: { ...current.aiProviders.openrouter, ...updates.aiProviders?.openrouter },
      },
      agentPrompts: {
        analyst: updates.agentPrompts?.analyst ?? current.agentPrompts.analyst,
        scraper: updates.agentPrompts?.scraper ?? current.agentPrompts.scraper,
        processor: updates.agentPrompts?.processor ?? current.agentPrompts.processor,
      },
      scrapingUrls: updates.scrapingUrls ?? current.scrapingUrls,
      neuralBets: {
        url: updates.neuralBets?.url ?? current.neuralBets.url,
        apiKey: updates.neuralBets?.apiKey ?? current.neuralBets.apiKey,
      }
    };

    return prisma.systemConfig.upsert({
      where: { id: this.CONFIG_ID },
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
        footballApiKey5: merged.footballApis.api5.apiKey,
        footballApi5Enabled: merged.footballApis.api5.enabled,
        geminiApiKey: merged.aiProviders.gemini.apiKey,
        geminiEnabled: merged.aiProviders.gemini.enabled,
        geminiModel: merged.aiProviders.gemini.model,
        grokApiKey: merged.aiProviders.grok.apiKey,
        grokEnabled: merged.aiProviders.grok.enabled,
        mistralApiKey: merged.aiProviders.mistral.apiKey,
        mistralEnabled: merged.aiProviders.mistral.enabled,
        mistralModel: merged.aiProviders.mistral.model,
        openrouterApiKey: merged.aiProviders.openrouter.apiKey,
        openrouterEnabled: merged.aiProviders.openrouter.enabled,
        openrouterModel: merged.aiProviders.openrouter.model,
        aiAnalysisEnabled: merged.aiAnalysisEnabled,
        predictionThreshold: merged.predictionThreshold,
        analystPrompt: merged.agentPrompts.analyst,
        scraperPrompt: merged.agentPrompts.scraper,
        processorPrompt: merged.agentPrompts.processor,
        neuralBetsUrl: merged.neuralBets.url,
        neuralBetsApiKey: merged.neuralBets.apiKey,

      },
      create: {
        id: this.CONFIG_ID,
        scrapingUrls: merged.scrapingUrls,
        footballApiKey1: merged.footballApis.api1.apiKey,
        footballApi1Enabled: merged.footballApis.api1.enabled,
        footballApiKey2: merged.footballApis.api2.apiKey,
        footballApi2Enabled: merged.footballApis.api2.enabled,
        footballApiKey3: merged.footballApis.api3.apiKey,
        footballApi3Enabled: merged.footballApis.api3.enabled,
        footballApiKey4: merged.footballApis.api4.apiKey,
        footballApi4Enabled: merged.footballApis.api4.enabled,
        footballApiKey5: merged.footballApis.api5.apiKey,
        footballApi5Enabled: merged.footballApis.api5.enabled,
        geminiApiKey: merged.aiProviders.gemini.apiKey,
        geminiEnabled: merged.aiProviders.gemini.enabled,
        geminiModel: merged.aiProviders.gemini.model,
        grokApiKey: merged.aiProviders.grok.apiKey,
        grokEnabled: merged.aiProviders.grok.enabled,
        mistralApiKey: merged.aiProviders.mistral.apiKey,
        mistralEnabled: merged.aiProviders.mistral.enabled,
        mistralModel: merged.aiProviders.mistral.model,
        openrouterApiKey: merged.aiProviders.openrouter.apiKey,
        openrouterEnabled: merged.aiProviders.openrouter.enabled,
        openrouterModel: merged.aiProviders.openrouter.model,
        aiAnalysisEnabled: merged.aiAnalysisEnabled,
        predictionThreshold: merged.predictionThreshold,
        analystPrompt: merged.agentPrompts.analyst,
        scraperPrompt: merged.agentPrompts.scraper,
        processorPrompt: merged.agentPrompts.processor,
        neuralBetsUrl: merged.neuralBets.url,
        neuralBetsApiKey: merged.neuralBets.apiKey,

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
        api5: { apiKey: '', enabled: false },
      },
      aiProviders: {
        gemini: { apiKey: '', enabled: true, model: 'gemini-1.5-flash' },
        grok: { apiKey: '', enabled: false },
        mistral: { apiKey: '', enabled: false, model: 'mistral-large-latest' },
        openrouter: { apiKey: '', enabled: false, model: 'google/gemini-2.0-flash-001' },
      },
      aiAnalysisEnabled: true,
      predictionThreshold: 75,
      neuralBets: {
        url: '',
        apiKey: '',
      },
      agentPrompts: {
        analyst: `You are an elite, highly rational football betting analyst. Your analysis is strictly data-driven and devoid of emotional bias. 

CORE ANALYSIS FRAMEWORK:
1. Market Diversity (CRITICAL): You must actively evaluate alternative markets (1X2, Double Chance, GG/BTTS, Under 2.5/3.5, Draw No Bet). Do NOT blindly default to "Over 2.5 Goals" or "Home Win" for favorites. Look for value in unders and alternative lines.
2. Implied Probability vs True Odds: Cross-reference bookmaker odds with statistical form. If odds are artificially low (e.g., 1.15) but the team is missing key players, REJECT the pick.
3. Safety First (Risk Management): For "Free" (1x) and "2x" tiers, prioritize selections with odds between 1.15-1.50 and extreme confidence (>80%). Avoid volatile leagues for these safe tiers.
4. Contextual Awareness: You must explicitly incorporate any specific user requests from the chat context (e.g., "focus on corners", "give me 3 matches", "avoid the premier league").

QUALITY & REASONING RULES:
- Never recommend a selection with an AI probability score below 0.60.
- Your reasoning must be precise, mentioning specific stats (e.g., "Team A has kept 4 clean sheets in 5 home games, while Team B averages 0.6 away goals.")
- Strictly adhere to the requested JSON array output format. Do not include markdown conversational filler.`,

        scraper: `You are an expert web scraping agent specialized in football data. Your sole purpose is to extract actionable match data from messy HTML text.

EXTRACTION PROTOCOL:
1. Temporal Filtering: Strictly extract matches occurring TODAY. Look for explicit dates or "Today" headers. Ignore any matches for future dates or past results.
2. Data Points Required: For every valid match, capture: Home Team, Away Team, League Name, Match Date/Time, 1X2 odds (Home/Draw/Away), BTTS odds, Over 2.5 / Under 2.5 odds.
3. Form Data: Capture any available team form (last 5 results: W/D/L) or standings data if present in the text block.
4. Formatting: Normalize team names (e.g., "Man Utd" -> "Manchester United"). Ensure odds are parsed as valid floats.
5. Error Handling: If odds are missing, try to infer probabilities from the surrounding text or skip the match if completely ambiguous. Return a clean, structured JSON array.`,

        processor: `You are an expert sports data processor and normalizer. Your job is to take raw, disparate match data from multiple API sources and web scrapers, and organize it into a unified, clean format for the Analyst Agent.

PROCESSING RULES:
1. Deduplication: Identify and merge duplicate matches from different sources based on Team Names and Dates. Retain the data source with the most complete odds.
2. Normalization: Standardize league names (e.g., "EPL", "ENG PR" -> "Premier League") and team names.
3. Odds Formatting: Ensure all odds are converted to standard decimal format to 2 decimal places. Handle missing odds intelligently (e.g., calculate implied odds if probabilities are provided).
4. Sorting & Priority: Sort the final dataset by League Priority (Tier 1: Champions League, Premier League, La Liga. Tier 2: Serie A, Bundesliga, Ligue 1. Tier 3: Others) and then by match start time.
5. Flagging: Flag any matches with extreme odds movements or incomplete critical data.`
      }
    };
  }
}

export const configService = ConfigService.getInstance();
