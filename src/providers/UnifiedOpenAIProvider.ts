import OpenAI from 'openai';
import { AIProvider, AIModel, ChatCompletionRequest, ChatCompletion, ProviderConfig, SpeechSettings } from './types';
import { CustomError } from '../service/CustomError';

export class UnifiedOpenAIProvider implements AIProvider {
  readonly name: string;
  readonly displayName: string;
  readonly baseUrl: string;
  private openai: OpenAI;

  constructor(config: ProviderConfig & { name: string; displayName: string }) {
    this.name = config.name;
    this.displayName = config.displayName;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      defaultHeaders: {
          'x-stainless-arch': null,
          'x-stainless-lang': null,
          'x-stainless-os': null,
          'x-stainless-package-version': null,
          'x-stainless-retry-count': null,
          'x-stainless-runtime': null,
          'x-stainless-runtime-version': null,
          'x-stainless-timeout': null,
        },
      baseURL: this.baseUrl.endsWith('/v1') || this.baseUrl.endsWith('openai') ? this.baseUrl : `${this.baseUrl}/v1`,
      dangerouslyAllowBrowser: true, // Required for browser usage
    });
  }

  async getModels(): Promise<AIModel[]> {
    try {
      const response = await this.openai.models.list();
      
      return response.data.map((model: any) => {
        const contextWindow = model.context_length || model.max_tokens || this.inferContextWindow(model.id);
        const imageSupport = this.inferImageSupport(model.id, model.capabilities);
        const deprecated = model.deprecated || this.inferDeprecated(model.id);
        const preferred = this.inferPreferred(model.id);
        
        return {
          id: model.id,
          name: model.id,
          provider: this.name,
          contextWindow: contextWindow,
          knowledgeCutoff: model.knowledge_cutoff || this.inferKnowledgeCutoff(model.id),
          imageSupport: imageSupport,
          preferred: preferred,
          deprecated: deprecated,
        };
      });
    } catch (error) {
      console.warn(`Failed to fetch models from ${this.displayName} API, using fallback models:`, error);
      return this.getFallbackModels();
    }
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletion> {
    try {
      const filteredRequest = this.filterRequestParameters(request);
      const convertedMessages = this.convertMessages(filteredRequest.messages);
      
      const response = await this.openai.chat.completions.create({
        model: filteredRequest.model,
        messages: convertedMessages as any[],
        temperature: filteredRequest.temperature,
        max_tokens: filteredRequest.max_tokens,
        top_p: filteredRequest.top_p,
        frequency_penalty: filteredRequest.frequency_penalty,
        presence_penalty: filteredRequest.presence_penalty,
        stream: false,
      });

      return response as ChatCompletion;
    } catch (error: any) {
      throw new CustomError(error.message || 'Request failed', error.status);
    }
  }

  async createChatCompletionStream(request: ChatCompletionRequest): Promise<ReadableStream> {
    try {
      const filteredRequest = this.filterRequestParameters(request);
      const convertedMessages = this.convertMessages(filteredRequest.messages);
      
      const stream = await this.openai.chat.completions.create({
        model: filteredRequest.model,
        messages: convertedMessages as any[],
        temperature: filteredRequest.temperature,
        max_tokens: filteredRequest.max_tokens,
        top_p: filteredRequest.top_p,
        frequency_penalty: filteredRequest.frequency_penalty,
        presence_penalty: filteredRequest.presence_penalty,
        stream: true,
      });

      // Convert OpenAI stream to ReadableStream
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } catch (error: any) {
      throw new CustomError(error.message || 'Request failed', error.status);
    }
  }

  async textToSpeech(text: string, settings: SpeechSettings): Promise<string> {
    // Only OpenAI supports TTS, others will throw an error
    if (this.name !== 'openai') {
      throw new Error(`Text-to-speech is not supported by ${this.displayName}`);
    }

    try {
      if (text.length > 4096) {
        throw new Error("Input text exceeds the maximum length of 4096 characters.");
      }

      if (settings.speed < 0.25 || settings.speed > 4.0) {
        throw new Error("Speed must be between 0.25 and 4.0.");
      }

      const response = await this.openai.audio.speech.create({
        model: settings.id as any,
        voice: settings.voice as any,
        input: text,
        speed: settings.speed,
        response_format: "mp3",
      });

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      throw new CustomError(error.message || 'TTS request failed', error.status);
    }
  }

  async getSpeechModels(): Promise<AIModel[]> {
    // Only OpenAI supports TTS
    if (this.name !== 'openai') {
      return [];
    }

    return [
      {
        id: 'tts-1',
        name: 'TTS-1',
        provider: this.name,
        contextWindow: 0,
        knowledgeCutoff: '',
        imageSupport: false,
        preferred: true,
        deprecated: false,
      },
      {
        id: 'tts-1-hd',
        name: 'TTS-1 HD',
        provider: this.name,
        contextWindow: 0,
        knowledgeCutoff: '',
        imageSupport: false,
        preferred: false,
        deprecated: false,
      }
    ];
  }

  private convertMessages(messages: any[]): any[] {
    // Convert message format for providers that need different structures
    return messages.map(msg => {
      if (Array.isArray(msg.content)) {
        // Convert array content to string for providers like DeepSeek that expect strings
        if (this.needsStringContent()) {
          const textParts = msg.content
            .filter((part: any) => part.type === 'text' && part.text)
            .map((part: any) => part.text);
          
          return {
            ...msg,
            content: textParts.join('\n')
          };
        }
        // For vision-capable models, keep the array format
        return msg;
      }
      // Already a string, return as-is
      return msg;
    });
  }

  private needsStringContent(): boolean {
    // Providers that expect string content instead of array format
    return this.name === 'deepseek' || this.name === 'together' || this.name === 'ollama';
  }

  private isReasoningModel(modelId: string): boolean {
    // Reasoning models that don't support temperature and other parameters
    return modelId.includes('o1') || modelId.includes('o3') || modelId.includes('o4-mini');
  }

  private supportsTopP(modelId: string): boolean {
    // Models that don't support top_p parameter
    // GPT-5 family and reasoning models don't support top_p
    return !(modelId.includes('gpt-5') || modelId.includes('o1') || modelId.includes('o3') || modelId.includes('o4-mini'));
  }

  private filterRequestParameters(request: ChatCompletionRequest): ChatCompletionRequest {
    const filteredRequest = { ...request };

    // Remove top_p for models that don't support it (GPT-5 family, reasoning models)
    if (!this.supportsTopP(request.model)) {
      delete filteredRequest.top_p;
    }

    // For reasoning models, remove additional unsupported parameters
    if (this.isReasoningModel(request.model)) {
      delete filteredRequest.temperature;
      delete filteredRequest.frequency_penalty;
      delete filteredRequest.presence_penalty;
    }

    return filteredRequest;
  }

  private inferContextWindow(modelId: string): number {
    // Provider-specific context window inference
    if (this.name === 'openai') {
      if (modelId.includes('gpt-5')) return 1000000;
      if (modelId.includes('gpt-4.1')) return 1000000;
      if (modelId.includes('o4-mini')) return 128000;
      if (modelId.includes('o3')) return 128000;
      if (modelId.includes('gpt-4o') || modelId.includes('gpt-4-turbo')) return 128000;
      if (modelId.includes('gpt-4-32k')) return 32768;
      if (modelId.includes('gpt-4')) return 8192;
      if (modelId.includes('gpt-3.5-turbo-16k')) return 16385;
      if (modelId.includes('gpt-3.5-turbo')) return 4096;
      if (modelId.includes('o1')) return 128000;
    } else if (this.name === 'xai') {
      return 131072; // xAI models generally have 128k context
    } else if (this.name === 'anthropic') {
      if (modelId.includes('claude-3-5')) return 200000;
      if (modelId.includes('claude-3')) return 200000;
      return 100000;
    } else if (this.name === 'deepseek') {
      if (modelId.includes('deepseek-r1')) return 128000;
      if (modelId.includes('deepseek-v3')) return 128000;
      return 32000;
    } else if (this.name === 'gemini') {
      if (modelId.includes('gemini-1.5-pro')) return 2000000;
      if (modelId.includes('gemini-1.5-flash')) return 1048576;
      if (modelId.includes('gemini-pro')) return 30720;
      return 8192;
    } else if (this.name === 'together') {
      if (modelId.includes('llama-2-70b')) return 4096;
      if (modelId.includes('llama-2-13b')) return 4096;
      if (modelId.includes('mixtral-8x7b')) return 32768;
      if (modelId.includes('mixtral-8x22b')) return 65536;
      if (modelId.includes('llama-3-70b')) return 8192;
      if (modelId.includes('llama-3-8b')) return 8192;
      if (modelId.includes('qwen')) return 32768;
      return 4096;
    } else if (this.name === 'ollama') {
      if (modelId.includes('llama3:70b')) return 8192;
      if (modelId.includes('llama3:8b')) return 8192;
      if (modelId.includes('llama2:70b')) return 4096;
      if (modelId.includes('llama2:13b')) return 4096;
      if (modelId.includes('llama2:7b')) return 4096;
      if (modelId.includes('mixtral:8x7b')) return 32768;
      if (modelId.includes('qwen')) return 32768;
      return 4096;
    }
    
    // Default fallback
    return 4096;
  }

  private inferKnowledgeCutoff(modelId: string): string {
    // Provider-specific knowledge cutoff inference
    if (this.name === 'openai') {
      if (modelId.includes('gpt-5')) return '6/2024';
      if (modelId.includes('o4-mini') || modelId.includes('o3')) return '6/2024';
      if (modelId.includes('gpt-4.1') || modelId.includes('2025')) return '6/2024';
      if (modelId.includes('gpt-4o') || modelId.includes('o1') || modelId.includes('2024')) return '10/2023';
      if (modelId.includes('gpt-4-turbo') || modelId.includes('0125')) return '12/2023';
      if (modelId.includes('gpt-4-1106') || modelId.includes('1106')) return '4/2023';
      if (modelId.includes('gpt-4')) return '9/2021';
      if (modelId.includes('gpt-3.5')) return '9/2021';
    } else if (this.name === 'xai') {
      if (modelId.includes('grok-4')) return '6/2024';
      if (modelId.includes('grok-3')) return '6/2024';
      if (modelId.includes('grok-2-1212')) return '12/2024';
      return '10/2023';
    } else if (this.name === 'anthropic') {
      if (modelId.includes('claude-3-5')) return '4/2024';
      if (modelId.includes('claude-3')) return '8/2023';
      return '9/2021';
    } else if (this.name === 'gemini') {
      if (modelId.includes('1.5')) return '4/2024';
      return '4/2024';
    } else if (this.name === 'together') {
      if (modelId.includes('2024')) return '4/2024';
      if (modelId.includes('2023')) return '9/2023';
      if (modelId.includes('llama-3')) return '4/2024';
      if (modelId.includes('mixtral')) return '12/2023';
      return '9/2023';
    } else if (this.name === 'ollama') {
      if (modelId.includes('llama3')) return '4/2024';
      if (modelId.includes('llama2')) return '9/2023';
      return '9/2023';
    }
    
    return '10/2023';
  }

  private inferImageSupport(modelId: string, capabilities?: any): boolean {
    // Check capabilities first if available
    if (capabilities?.vision) return true;
    if (capabilities?.multimodal) return true;
    
    // Provider-specific image support patterns
    if (this.name === 'openai') {
      const imageSupportModels = [
        'gpt-5', 'gpt-4o', 'gpt-4.1', 'gpt-4-turbo', 'gpt-4-vision', 
        'chatgpt-4o', 'gpt-4-1106-vision', 'o3', 'o4-mini'
      ];
      return imageSupportModels.some(model => modelId.includes(model));
    } else if (this.name === 'xai') {
      const imageSupportModels = ['grok-4', 'grok-3', 'grok-2-vision', 'grok-2-image'];
      return imageSupportModels.some(model => modelId.includes(model));
    } else if (this.name === 'anthropic') {
      return modelId.includes('claude-3') || modelId.includes('claude-3-5');
    } else if (this.name === 'gemini') {
      return modelId.includes('pro') || modelId.includes('flash');
    } else if (this.name === 'together') {
      const visionModels = ['llava', 'llava-next'];
      return visionModels.some(model => modelId.toLowerCase().includes(model));
    } else if (this.name === 'ollama') {
      const visionModels = ['llava', 'bakllava'];
      return visionModels.some(model => modelId.toLowerCase().includes(model));
    }
    
    return false;
  }

  private inferPreferred(modelId: string): boolean {
    // Provider-specific preferred models
    if (this.name === 'openai') {
      const preferredModels = ['gpt-5', 'o3', 'o4-mini', 'gpt-4.1', 'gpt-4o', 'chatgpt-4o-latest'];
      return preferredModels.some(model => modelId.includes(model));
    } else if (this.name === 'xai') {
      const preferredModels = ['grok-4-0709', 'grok-3', 'grok-3-fast'];
      return preferredModels.some(model => modelId === model);
    } else if (this.name === 'anthropic') {
      return modelId.includes('claude-3-5-sonnet');
    } else if (this.name === 'deepseek') {
      return modelId.includes('deepseek-r1') || modelId.includes('deepseek-v3');
    } else if (this.name === 'gemini') {
      return modelId.includes('1.5-pro') || modelId.includes('1.5-flash');
    } else if (this.name === 'together') {
      const preferredModels = ['llama-3-70b', 'mixtral-8x22b', 'qwen2-72b'];
      return preferredModels.some(model => modelId.includes(model));
    } else if (this.name === 'ollama') {
      return modelId.includes('llama3:70b') || modelId.includes('llama3:8b');
    }
    
    return false;
  }

  private inferDeprecated(modelId: string): boolean {
    // Provider-specific deprecated models
    if (this.name === 'openai') {
      const deprecatedPatterns = [
        'instruct', 'davinci', 'curie', 'babbage', 'ada',
        'gpt-4-32k', 'gpt-3.5-turbo-16k', 'preview-2024-09-12'
      ];
      return deprecatedPatterns.some(pattern => modelId.includes(pattern));
    }
    
    return false;
  }

  private getFallbackModels(): AIModel[] {
    // Provider-specific fallback models
    switch (this.name) {
      case 'openai':
        return [
          {
            id: 'gpt-5',
            name: 'GPT-5',
            provider: this.name,
            contextWindow: 1000000,
            knowledgeCutoff: '6/2024',
            imageSupport: true,
            preferred: true,
            deprecated: false,
          },
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: this.name,
            contextWindow: 128000,
            knowledgeCutoff: '10/2023',
            imageSupport: true,
            preferred: false,
            deprecated: false,
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            provider: this.name,
            contextWindow: 4096,
            knowledgeCutoff: '9/2021',
            imageSupport: false,
            preferred: false,
            deprecated: false,
          },
        ];
      
      case 'xai':
        return [
          {
            id: 'grok-4-0709',
            name: 'Grok-4 (July 2024)',
            provider: this.name,
            contextWindow: 131072,
            knowledgeCutoff: '6/2024',
            imageSupport: true,
            preferred: true,
            deprecated: false,
          },
          {
            id: 'grok-3',
            name: 'Grok-3',
            provider: this.name,
            contextWindow: 131072,
            knowledgeCutoff: '6/2024',
            imageSupport: true,
            preferred: true,
            deprecated: false,
          },
        ];
      
      case 'anthropic':
        return [
          {
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
            provider: this.name,
            contextWindow: 200000,
            knowledgeCutoff: '4/2024',
            imageSupport: true,
            preferred: true,
            deprecated: false,
          },
        ];
      
      case 'deepseek':
        return [
          {
            id: 'deepseek-r1',
            name: 'DeepSeek R1',
            provider: this.name,
            contextWindow: 128000,
            knowledgeCutoff: '6/2024',
            imageSupport: false,
            preferred: true,
            deprecated: false,
          },
        ];
      
      case 'gemini':
        return [
          {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            provider: this.name,
            contextWindow: 2000000,
            knowledgeCutoff: '4/2024',
            imageSupport: true,
            preferred: true,
            deprecated: false,
          },
          {
            id: 'gemini-1.5-flash',
            name: 'Gemini 1.5 Flash',
            provider: this.name,
            contextWindow: 1048576,
            knowledgeCutoff: '4/2024',
            imageSupport: true,
            preferred: true,
            deprecated: false,
          },
          {
            id: 'gemini-pro',
            name: 'Gemini Pro',
            provider: this.name,
            contextWindow: 30720,
            knowledgeCutoff: '4/2024',
            imageSupport: true,
            preferred: false,
            deprecated: false,
          },
        ];
      
      case 'together':
        return [
          {
            id: 'meta-llama/Llama-3-70b-chat-hf',
            name: 'Llama 3 70B Chat',
            provider: this.name,
            contextWindow: 8192,
            knowledgeCutoff: '4/2024',
            imageSupport: false,
            preferred: true,
            deprecated: false,
          },
          {
            id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
            name: 'Mixtral 8x7B Instruct',
            provider: this.name,
            contextWindow: 32768,
            knowledgeCutoff: '12/2023',
            imageSupport: false,
            preferred: false,
            deprecated: false,
          },
        ];
      
      case 'ollama':
        return [
          {
            id: 'llama3:8b',
            name: 'Llama 3 8B',
            provider: this.name,
            contextWindow: 8192,
            knowledgeCutoff: '4/2024',
            imageSupport: false,
            preferred: true,
            deprecated: false,
          },
          {
            id: 'llama2:7b',
            name: 'Llama 2 7B',
            provider: this.name,
            contextWindow: 4096,
            knowledgeCutoff: '9/2023',
            imageSupport: false,
            preferred: false,
            deprecated: false,
          },
        ];
      
      default:
        return [];
    }
  }
}