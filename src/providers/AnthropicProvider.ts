import { UnifiedOpenAIProvider } from './UnifiedOpenAIProvider';
import { ProviderConfig } from './types';

export class AnthropicProvider extends UnifiedOpenAIProvider {
  constructor(config: ProviderConfig) {
    super({
      ...config,
      name: 'anthropic',
      displayName: 'Anthropic (Claude)',
      baseUrl: config.baseUrl || 'https://api.anthropic.com'
    });
  }
}