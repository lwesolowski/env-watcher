export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionParams {
  model?: string;
  messages?: Message[];
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  response_format?: {
    type: "json_schema" | "text";
    json_schema?: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
}

export interface OpenRouterError {
  message: string;
  code: number;
  metadata?: unknown;
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      content: string | null;
      role: string;
    };
    finish_reason: string;
  }[];
  error?: OpenRouterError;
}

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  siteUrl?: string;
  siteName?: string;
}
