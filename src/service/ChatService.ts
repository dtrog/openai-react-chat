import {AIModel, AIProvider, ProviderManager} from "../providers";
import {ChatCompletion, ChatCompletionMessage, ChatCompletionRequest, ChatMessage, ChatMessagePart, Role} from "../models/ChatCompletion";
import {CustomError} from "./CustomError";
import {ChatSettings} from "../models/ChatSettings";
import {CHAT_STREAM_DEBOUNCE_TIME} from "../constants/appConstants";
import {NotificationService} from '../service/NotificationService';

interface CompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CompletionChunkChoice[];
}

interface CompletionChunkChoice {
  index: number;
  delta: {
    content: string;
  };
  finish_reason: null | string;
}

export class ChatService {
  private static models: Promise<AIModel[]> | null = null;
  static abortController: AbortController | null = null;
  private static currentProvider: AIProvider | null = null;

  static getCurrentProvider(): AIProvider | null {
    return this.currentProvider;
  }

  static setProvider(provider: AIProvider): void {
    this.currentProvider = provider;
    this.models = null;
  }

  static async mapChatMessagesToCompletionMessages(modelId: string, messages: ChatMessage[]): Promise<ChatCompletionMessage[]> {
    const model = await this.getModelById(modelId);
    if (!model) {
      throw new Error(`Model with ID '${modelId}' not found`);
    }

    return messages.map((message) => {
      const contentParts: ChatMessagePart[] = [{
        type: 'text',
        text: message.content
      }];

      if (model.imageSupport && message.fileDataRef) {
        message.fileDataRef.forEach((fileRef) => {
          const fileUrl = fileRef.fileData!.data;
          if (fileUrl) {
            const fileType = (fileRef.fileData!.type.startsWith('image')) ? 'image_url' : fileRef.fileData!.type;
            contentParts.push({
              type: fileType,
              image_url: fileType === 'image_url' ? { url: fileUrl } : undefined
            } as ChatMessagePart);
          }
        });
      }

      return {
        role: message.role,
        content: contentParts
      };
    });
  }

  static async sendMessage(messages: ChatMessage[], chatSettings: ChatSettings, onMessageReceived?: (message: string) => void): Promise<ChatCompletion> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    if (!chatSettings.model) {
      throw new Error('No model specified in chat settings');
    }

    const completionMessages = await this.mapChatMessagesToCompletionMessages(chatSettings.model, messages);
    
    const requestBody: ChatCompletionRequest = {
      messages: completionMessages,
      model: chatSettings.model,
      temperature: chatSettings.temperature,
      top_p: chatSettings.top_p,
      frequency_penalty: chatSettings.frequency_penalty,
      presence_penalty: chatSettings.presence_penalty
    };

    if (chatSettings.stream) {
      return this.sendStreamingMessage(requestBody, onMessageReceived || (() => {}));
    } else {
      return this.currentProvider.createChatCompletion(requestBody);
    }
  }

  private static async sendStreamingMessage(requestBody: ChatCompletionRequest, onMessageReceived: (message: string) => void): Promise<ChatCompletion> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    this.abortController = new AbortController();
    
    try {
      const stream = await this.currentProvider.createChatCompletionStream(requestBody);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullMessage = '';

      const processBuffer = () => {
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine === 'data: [DONE]') {
            continue;
          }
          
          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.substring(6);
              const chunk: CompletionChunk = JSON.parse(jsonStr);
              
              if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                const content = chunk.choices[0].delta.content;
                fullMessage += content;
                onMessageReceived(content);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Debounce processing to improve performance
        await new Promise(resolve => setTimeout(resolve, CHAT_STREAM_DEBOUNCE_TIME));
        processBuffer();
      }

      // Process any remaining buffer
      processBuffer();

      // Return a mock completion response for streaming
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestBody.model,
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        choices: [{
          message: {
            role: Role.Assistant,
            content: fullMessage,
            messageType: 'normal' as any
          } as ChatMessage,
          finish_reason: 'stop',
          index: 0
        }]
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CustomError('Request was cancelled', error);
      }
      throw error;
    }
  }

  static abortRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  static async getModels(): Promise<AIModel[]> {
    if (!this.models) {
      this.models = this.fetchModels();
    }
    return this.models;
  }

  private static async fetchModels(): Promise<AIModel[]> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    try {
      return await this.currentProvider.getModels();
    } catch (error) {
      NotificationService.handleUnexpectedError(error as Error, 'Error loading models');
      throw error;
    }
  }

  static async getModelById(id: string): Promise<AIModel | undefined> {
    const models = await this.getModels();
    return models.find(model => model.id === id);
  }

  static async validateApiKey(): Promise<boolean> {
    if (!this.currentProvider) {
      return false;
    }

    try {
      await this.currentProvider.getModels();
      return true;
    } catch (error) {
      return false;
    }
  }
}