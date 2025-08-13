import { UnifiedOpenAIProvider } from './UnifiedOpenAIProvider';
import { ProviderConfig } from './types';

export class GeminiProvider extends UnifiedOpenAIProvider {
  constructor(config: ProviderConfig) {
    super({
      ...config,
      name: 'gemini',
      displayName: 'Google Gemini',
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai'
    });
  }
}