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