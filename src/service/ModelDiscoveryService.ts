import { ProviderManager, ProviderRegistration } from '../providers/ProviderManager';
import { AIModel, AIProvider, ProviderConfig } from '../providers/types';

/**
 * Dynamically fetches all available models and their specifications from all registered providers.
 * Returns a flat array of AIModel objects, each annotated with provider and model details.
 * Providers that fail to respond are skipped (with a warning).
 */
export async function discoverAllProviderModels(providerConfigs: Record<string, ProviderConfig>): Promise<AIModel[]> {
  const pm = ProviderManager.getInstance();
  const providers: ProviderRegistration[] = pm.getAvailableProviders();
  const allModels: AIModel[] = [];

  for (const reg of providers) {
    const config = providerConfigs[reg.name];
    if (!config || !config.apiKey) {
      // Skip providers with no config or missing API key
      continue;
    }
    let provider: AIProvider;
    try {
      provider = pm.createProvider(reg.name, config);
      // getModels() is already implemented to call the provider's REST API
      const models = await provider.getModels();
      for (const m of models) {
        allModels.push({ ...m, provider: reg.name });
      }
    } catch (err) {
      // Log and skip this provider
      // eslint-disable-next-line no-console
      console.warn(`[ModelDiscovery] Failed to fetch models for provider ${reg.name}:`, err);
      continue;
    }
  }
  return allModels;
}

/**
 * Fetches models for a single provider by name, using the given config.
 */
export async function discoverProviderModels(providerName: string, config: ProviderConfig): Promise<AIModel[]> {
  const pm = ProviderManager.getInstance();
  const reg = pm.getProviderRegistration(providerName);
  if (!reg) throw new Error(`Provider ${providerName} not registered`);
  const provider = pm.createProvider(providerName, config);
  return provider.getModels();
}
