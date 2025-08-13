import { UserContext } from '../UserContext';
import { ProviderManager } from '../providers/ProviderManager';
import { ChatService } from './ChatService';
import { ENV_CONFIG } from '../config';
import { ProviderConfig } from '../providers/types';
import { useContext, useEffect } from 'react';

export class ProviderInitializer {
  static async initializeFromUserSettings(userSettings: any): Promise<void> {
    const providerManager = ProviderManager.getInstance();
    
    // Find the config for the active provider in the array
    const config = userSettings.providerConfigs.find((p: ProviderConfig) => p.name === userSettings.activeProvider);
    if (userSettings.activeProvider && config) {
      const provider = providerManager.createProvider(userSettings.activeProvider, config);
      ChatService.setProvider(provider);
      return;
    }

    // Fall back to environment configuration
    await this.initializeFromEnvironment();
  }

  static async initializeFromEnvironment(): Promise<void> {
    const providerManager = ProviderManager.getInstance();
    
    // Try new provider configuration first
    if (ENV_CONFIG.providers && ENV_CONFIG.default_provider) {
      const defaultProviderName = ENV_CONFIG.default_provider;
      const providerConfig = ENV_CONFIG.providers[defaultProviderName];
      
      if (providerConfig) {
        const config: ProviderConfig = {
          name: defaultProviderName,
          apiKey: providerConfig.apiKey,
          baseUrl: providerConfig.baseUrl,
        };
        
        const provider = providerManager.createProvider(defaultProviderName, config);
        ChatService.setProvider(provider);
        return;
      }
    }

    // Fall back to legacy OpenAI configuration
    if (ENV_CONFIG.api_key) {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: ENV_CONFIG.api_key,
        baseUrl: 'https://api.openai.com',
      };

      const provider = providerManager.createProvider('openai', config);
      ChatService.setProvider(provider);
      return;
    }

    console.warn('No AI provider configuration found');
  }
}

// React hook for provider initialization
export function useProviderInitialization() {
  const { userSettings } = useContext(UserContext);

  useEffect(() => {
    ProviderInitializer.initializeFromUserSettings(userSettings);
  }, [userSettings.activeProvider, userSettings.providerConfigs]);
}