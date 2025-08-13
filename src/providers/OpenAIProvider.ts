import { UnifiedOpenAIProvider } from './UnifiedOpenAIProvider';
import { ProviderConfig } from './types';

export class OpenAIProvider extends UnifiedOpenAIProvider {
  constructor(config: ProviderConfig) {
    super({
      ...config,
      name: 'openai',
      displayName: 'OpenAI',
      baseUrl: config.baseUrl || 'https://api.openai.com'
    });
  }
}