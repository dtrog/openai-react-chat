import { UnifiedOpenAIProvider } from './UnifiedOpenAIProvider';
import { ProviderConfig } from './types';

export class TogetherProvider extends UnifiedOpenAIProvider {
  constructor(config: ProviderConfig) {
    super({
      ...config,
      name: 'together',
      displayName: 'Together AI',
      baseUrl: config.baseUrl || 'https://api.together.xyz'
    });
  }
}