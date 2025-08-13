// Simple test to verify provider functionality
// Note: These are basic tests to verify the structure works
// In a real scenario, you'd want more comprehensive tests with mocking

import { OpenAIProvider } from '../OpenAIProvider';
import { XAIProvider } from '../XAIProvider';
import { AnthropicProvider } from '../AnthropicProvider';
import { OllamaProvider } from '../OllamaProvider';
import { TogetherProvider } from '../TogetherProvider';
import { GeminiProvider } from '../GeminiProvider';
import { DeepSeekProvider } from '../DeepSeekProvider';
import { ProviderManager } from '../ProviderManager';

describe('AI Providers', () => {
  describe('ProviderManager', () => {
    it('should be a singleton', () => {
      const manager1 = ProviderManager.getInstance();
      const manager2 = ProviderManager.getInstance();
      expect(manager1).toBe(manager2);
    });

    it('should have default providers registered', () => {
      const manager = ProviderManager.getInstance();
      const providers = manager.getAvailableProviders();
      
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.some(p => p.name === 'openai')).toBe(true);
      expect(providers.some(p => p.name === 'xai')).toBe(true);
      expect(providers.some(p => p.name === 'anthropic')).toBe(true);
      expect(providers.some(p => p.name === 'ollama')).toBe(true);
      expect(providers.some(p => p.name === 'together')).toBe(true);
      expect(providers.some(p => p.name === 'gemini')).toBe(true);
      expect(providers.some(p => p.name === 'deepseek')).toBe(true);
    });
  });

  describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider({
        name: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com'
      });
    });

    it('should have correct properties', () => {
      expect(provider.name).toBe('openai');
      expect(provider.displayName).toBe('OpenAI');
      expect(provider.baseUrl).toBe('https://api.openai.com');
    });

    it('should have fallback models', () => {
      // Test the fallback models method
      const fallbackModels = (provider as any).getFallbackModels();
      expect(fallbackModels.length).toBeGreaterThan(0);
      expect(fallbackModels[0]).toHaveProperty('id');
      expect(fallbackModels[0]).toHaveProperty('contextWindow');
      expect(fallbackModels[0]).toHaveProperty('imageSupport');
    });

    it('should infer model capabilities correctly', () => {
      // Test capability inference
      expect((provider as any).inferImageSupport('gpt-4o')).toBe(true);
      expect((provider as any).inferImageSupport('gpt-3.5-turbo')).toBe(false);
      expect((provider as any).inferContextWindow('gpt-4.1')).toBe(1047576);
      expect((provider as any).inferContextWindow('gpt-4')).toBe(8192);
      expect((provider as any).inferDeprecated('gpt-4-32k')).toBe(true);
      expect((provider as any).inferDeprecated('gpt-4o')).toBe(false);
    });
  });

  describe('XAIProvider', () => {
    let provider: XAIProvider;

    beforeEach(() => {
      provider = new XAIProvider({
        name: 'xai',
        apiKey: 'test-key',
        baseUrl: 'https://api.x.ai'
      });
    });

    it('should have correct properties', () => {
      expect(provider.name).toBe('xai');
      expect(provider.displayName).toBe('xAI (Grok)');
      expect(provider.baseUrl).toBe('https://api.x.ai');
    });

    it('should have fallback models', () => {
      const fallbackModels = (provider as any).getFallbackModels();
      expect(fallbackModels.length).toBeGreaterThan(0);
      expect(fallbackModels[0]).toHaveProperty('id');
      expect(fallbackModels[0]).toHaveProperty('contextWindow');
    });

    it('should infer grok model capabilities', () => {
      expect((provider as any).inferImageSupport('grok-4')).toBe(true);
      expect((provider as any).inferImageSupport('grok-3')).toBe(false);
      expect((provider as any).inferContextWindow('grok-3')).toBe(128000);
      expect((provider as any).inferPreferred('grok-3')).toBe(true);
    });
  });

  describe('GeminiProvider', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
      provider = new GeminiProvider({
        name: 'gemini`',
        apiKey: 'test-key',
        baseUrl: 'https://generativelanguage.googleapis.com'
      });
    });

    it('should have correct properties', () => {
      expect(provider.name).toBe('gemini');
      expect(provider.displayName).toBe('Google Gemini');
      expect(provider.baseUrl).toBe('https://generativelanguage.googleapis.com');
    });

    it('should have fallback models', () => {
      const fallbackModels = (provider as any).getFallbackModels();
      expect(fallbackModels.length).toBeGreaterThan(0);
      expect(fallbackModels[0]).toHaveProperty('id');
      expect(fallbackModels[0]).toHaveProperty('contextWindow');
      expect(fallbackModels.some((m: any) => m.id === 'gemini-1.5-pro')).toBe(true);
    });
  });

  describe('DeepSeekProvider', () => {
    let provider: DeepSeekProvider;

    beforeEach(() => {
      provider = new DeepSeekProvider({
        name: 'deepseek',
        apiKey: 'test-key',
        baseUrl: 'https://api.deepseek.com'
      });
    });

    it('should have correct properties', () => {
      expect(provider.name).toBe('deepseek');
      expect(provider.displayName).toBe('DeepSeek');
      expect(provider.baseUrl).toBe('https://api.deepseek.com');
    });

    it('should have fallback models', () => {
      const fallbackModels = (provider as any).getFallbackModels();
      expect(fallbackModels.length).toBeGreaterThan(0);
      expect(fallbackModels[0]).toHaveProperty('id');
      expect(fallbackModels[0]).toHaveProperty('contextWindow');
      expect(fallbackModels.some((m: any) => m.id === 'deepseek-r1')).toBe(true);
    });
  });

  describe('Provider Selection Flow', () => {
    it('should support provider-first model selection', () => {
      const manager = ProviderManager.getInstance();
      
      // Create a provider
      const provider = manager.createProvider('openai', {
        name: 'openai',
        apiKey: 'test-key'
      });
      
      expect(provider.name).toBe('openai');
      expect(provider.displayName).toBe('OpenAI');
      
      // Should be able to get models from specific provider
      const fallbackModels = (provider as any).getFallbackModels();
      expect(fallbackModels.length).toBeGreaterThan(0);
      expect(fallbackModels.every((m: any) => m.provider === 'openai')).toBe(true);
    });

    it('should support all seven provider types', () => {
      const manager = ProviderManager.getInstance();
      const providers = manager.getAvailableProviders();
      
      expect(providers.length).toBe(7);
      
      // Test creating each provider type
      const providerConfigs = [
        { name: 'openai', apiKey: 'test-key' },
        { name: 'xai', apiKey: 'test-key' },
        { name: 'anthropic', apiKey: 'test-key' },
        { name: 'ollama', apiKey: '', baseUrl: 'http://localhost:11434' },
        { name: 'together', apiKey: 'test-key' },
        { name: 'gemini', apiKey: 'test-key' },
        { name: 'deepseek', apiKey: 'test-key' },
      ];
      
      providerConfigs.forEach(config => {
        const provider = manager.createProvider(config.name, config);
        expect(provider.name).toBe(config.name);
      });
    });
  });
});