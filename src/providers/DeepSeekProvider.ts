import { UnifiedOpenAIProvider } from './UnifiedOpenAIProvider';
import { ProviderConfig } from './types';

export class DeepSeekProvider extends UnifiedOpenAIProvider {
  constructor(config: ProviderConfig) {
    super({
      ...config,
      name: 'deepseek',
      displayName: 'DeepSeek',
      baseUrl: config.baseUrl || 'https://api.deepseek.com'
    });
  }
}