import { UnifiedOpenAIProvider } from './UnifiedOpenAIProvider';
import { ProviderConfig } from './types';

export class OllamaProvider extends UnifiedOpenAIProvider {
  constructor(config: ProviderConfig) {
    super({
      ...config,
      name: 'ollama',
      displayName: 'Ollama (Local)',
      baseUrl: config.baseUrl || 'http://localhost:11434',
      apiKey: config.apiKey || '' // Ollama doesn't require API key by default
    });
  }
}