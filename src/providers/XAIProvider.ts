import { UnifiedOpenAIProvider } from './UnifiedOpenAIProvider';
import { ProviderConfig } from './types';

export class XAIProvider extends UnifiedOpenAIProvider {
  constructor(config: ProviderConfig) {
    super({
      ...config,
      name: 'xai',
      displayName: 'xAI (Grok)',
      baseUrl: config.baseUrl || 'https://api.x.ai'
    });
  }
}