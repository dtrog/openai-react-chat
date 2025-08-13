import localConfig from './local.env.json';

export interface EnvironmentConfig {
  api_key?: string;
  default_model?: string;
  api_base_url?: string;
  default_system_prompt?: string;
  providers?: Record<string, {
    apiKey: string;
    baseUrl?: string;
  }>;
  default_provider?: string;
}

// Load configuration from local.env.json
export const ENV_CONFIG: EnvironmentConfig = localConfig;
