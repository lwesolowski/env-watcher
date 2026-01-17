import type { OpenRouterConfig, CompletionParams, Message, OpenRouterResponse } from "../types/openrouter";

export class OpenRouterService {
  #apiKey: string;
  #baseUrl: string;
  #siteUrl: string | undefined;
  #siteName: string | undefined;

  public defaultModel = "openai/gpt-4o-mini";
  public defaultTemperature = 0.7;

  constructor(config: OpenRouterConfig) {
    this.#apiKey = config.apiKey;
    this.#baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this.#siteUrl = config.siteUrl;
    this.#siteName = config.siteName;
  }

  public validateConfig(): boolean {
    return !!this.#apiKey && !!this.#baseUrl;
  }

  #getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.#apiKey}`,
      "Content-Type": "application/json",
    };

    if (this.#siteUrl) {
      headers["HTTP-Referer"] = this.#siteUrl;
    }

    if (this.#siteName) {
      headers["X-Title"] = this.#siteName;
    }

    return headers;
  }

  #formatMessages(
    systemPrompt: string | undefined,
    userPrompt: string | undefined,
    existingMessages?: Message[]
  ): Message[] {
    const messages: Message[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    if (existingMessages) {
      messages.push(...existingMessages);
    }

    if (userPrompt) {
      messages.push({ role: "user", content: userPrompt });
    }

    // Upewnij się, że system message jest pierwszy, jeśli istnieje
    const systemIndex = messages.findIndex((m) => m.role === "system");
    if (systemIndex > 0) {
      const systemMessage = messages.splice(systemIndex, 1)[0];
      messages.unshift(systemMessage);
    }

    return messages;
  }

  async #handleResponse(response: Response): Promise<OpenRouterResponse> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status;

      let errorMessage = errorData.error?.message || response.statusText;

      if (status === 401) {
        errorMessage = `Unauthorized: Invalid API Key. ${errorMessage}`;
      } else if (status === 402) {
        errorMessage = `Payment Required: Insufficient credits on OpenRouter. ${errorMessage}`;
      } else if (status === 429) {
        errorMessage = `Too Many Requests: Rate limit exceeded. ${errorMessage}`;
      } else if (status === 400) {
        errorMessage = `Bad Request: Check your parameters or model. ${errorMessage}`;
      }

      throw new Error(`OpenRouter API Error (${status}): ${errorMessage}`);
    }

    return response.json();
  }

  public async completeChat<T>(params: CompletionParams): Promise<T> {
    const messages = this.#formatMessages(params.systemPrompt, params.userPrompt, params.messages);

    const body = {
      model: params.model || this.defaultModel,
      messages,
      temperature: params.temperature ?? this.defaultTemperature,
      max_tokens: params.max_tokens,
      top_p: params.top_p,
      response_format: params.response_format,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(`${this.#baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.#getHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await this.#handleResponse(response);
      const content = data.choices[0]?.message.content;

      if (!content) {
        throw new Error("OpenRouter returned an empty response.");
      }

      if (params.response_format?.type === "json_schema") {
        try {
          return JSON.parse(content) as T;
        } catch {
          throw new Error("Failed to parse structured JSON response from model.");
        }
      }

      return content as unknown as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("OpenRouter request timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
