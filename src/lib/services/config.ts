// Corrected updateConfig method
function updateConfig(newConfig) {
    // Load existing config
    let existingConfig = loadConfig();

    // Merge new values into existing config
    const mergedConfig = { ...existingConfig, ...newConfig };

    // Properly handle nested objects for API keys and flags
    mergedConfig.apiKeys = {
        ...existingConfig.apiKeys,
        ...newConfig.apiKeys
    };
    mergedConfig.flags = {
        ...existingConfig.flags,
        ...newConfig.flags
    };

    // Ensure correct assignment for mistralApiKey and mistralEnabled
    if (newConfig.mistralApiKey !== undefined) {
        mergedConfig.apiKeys.mistralApiKey = newConfig.mistralApiKey;
    }
    if (newConfig.mistralEnabled !== undefined) {
        mergedConfig.flags.mistralEnabled = newConfig.mistralEnabled;
    }

    // Error handling for config saving
    try {
        saveConfig(mergedConfig);
    } catch (error) {
        console.error('Failed to save config:', error);
        throw new Error('Config saving failed');
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
        mistralApiKey: merged.aiProviders.mistral.apiKey,
        mistralEnabled: merged.aiProviders.mistral.enabled,
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
        mistralApiKey: merged.aiProviders.mistral.apiKey,
        mistralEnabled: merged.aiProviders.mistral.enabled,
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
