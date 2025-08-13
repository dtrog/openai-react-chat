export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  knowledgeCutoff: string;
  imageSupport: boolean;
  preferred: boolean;
  deprecated: boolean;
}

export interface AIProvider {
  readonly name: string;
  readonly displayName: string;
  readonly baseUrl: string;
  
  // Chat completion methods
  getModels(): Promise<AIModel[]>;
  createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletion>;
  createChatCompletionStream(request: ChatCompletionRequest): Promise<ReadableStream>;
  
  // Text-to-speech methods (optional)
  textToSpeech?(text: string, settings: SpeechSettings): Promise<string>;
  getSpeechModels?(): Promise<AIModel[]>;
}

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl?: string;
}

export interface ChatCompletionRequest {
  messages: ChatCompletionMessage[];
  model: string;
  frequency_penalty?: number | null;
  presence_penalty?: number | null;
  logit_bias?: { [token: string]: number } | null;
  logprobs?: boolean | null;
  top_logprobs?: number | null;
  max_tokens?: number | null;
  n?: number | null;
  response_format?: {
    type: 'json_object';
  } | null;
  seed?: number | null;
  stop?: string | string[] | null;
  stream?: boolean | null;
  temperature?: number | null;
  top_p?: number | null;
  tools?: any[];
  tool_choice?: 'none' | 'auto' | {
    type: 'function';
    function: {
      name: string;
    };
  } | null;
  user?: string;
}

export interface ChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: ChatCompletionChoice[];
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: ChatMessagePart[];
}

export interface ChatMessagePart {
  type: string;
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatCompletionChoice {
  message: any; // Will map to existing ChatMessage
  finish_reason: string;
  index: number;
}

export interface SpeechSettings {
  id: string;
  voice: string;
  speed: number;
}