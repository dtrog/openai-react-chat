import { AIProvider, ProviderConfig } from './types';
import { OpenAIProvider } from './OpenAIProvider';
import { XAIProvider } from './XAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { OllamaProvider } from './OllamaProvider';
import { TogetherProvider } from './TogetherProvider';
import { GeminiProvider } from './GeminiProvider';
import { DeepSeekProvider } from './DeepSeekProvider';

export interface ProviderRegistration {
  name: string;
  displayName: string;
  provider: new (config: ProviderConfig) => AIProvider;
}


export class ProviderManager {
  private static instance: ProviderManager;
  private providers = new Map<string, AIProvider>();
  private registrations = new Map<string, ProviderRegistration>();

  private constructor() {
    this.registerDefaultProviders();
  }

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  private registerDefaultProviders(): void {
    this.registrations.set('openai', {
      name: 'openai',
      displayName: 'OpenAI',
      provider: OpenAIProvider,
    });

    this.registrations.set('xai', {
      name: 'xai',
      displayName: 'xAI (Grok)',
      provider: XAIProvider,
    });

    this.registrations.set('anthropic', {
      name: 'anthropic',
      displayName: 'Anthropic (Claude)',
      provider: AnthropicProvider,
    });

    this.registrations.set('ollama', {
      name: 'ollama',
      displayName: 'Ollama (Local)',
      provider: OllamaProvider,
    });

    this.registrations.set('together', {
      name: 'together',
      displayName: 'Together AI',
      provider: TogetherProvider,
    });

    this.registrations.set('gemini', {
      name: 'gemini',
      displayName: 'Google Gemini',
      provider: GeminiProvider,
    });

    this.registrations.set('deepseek', {
      name: 'deepseek',
      displayName: 'DeepSeek',
      provider: DeepSeekProvider,
    });
  }

  getAvailableProviders(): ProviderRegistration[] {
    return Array.from(this.registrations.values());
  }

  getProviderRegistration(name: string): ProviderRegistration | undefined {
    return this.registrations.get(name);
  }

  createProvider(name: string, config: ProviderConfig): AIProvider {
    const registration = this.registrations.get(name);
    if (!registration) {
      throw new Error(`Provider ${name} not found`);
    }

    const provider = new registration.provider(config);
    this.providers.set(name, provider);
    return provider;
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  removeProvider(name: string): void {
    this.providers.delete(name);
  }

  registerProvider(registration: ProviderRegistration): void {
    this.registrations.set(registration.name, registration);
  }
}