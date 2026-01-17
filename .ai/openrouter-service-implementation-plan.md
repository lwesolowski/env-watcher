# Plan Implementacji Usługi OpenRouter

Ten dokument opisuje architekturę i kroki wdrożenia usługi do komunikacji z API OpenRouter w ramach projektu Env-Watcher.

## 1. Opis usługi
`OpenRouterService` to centralny punkt komunikacji z modelami LLM (Large Language Models) poprzez agregator OpenRouter. Usługa odpowiada za formatowanie zapytań, zarządzanie wiadomościami (System/User), wymuszanie ustrukturyzowanych odpowiedzi JSON oraz obsługę błędów komunikacji. Jest zaprojektowana do działania w środowisku Astro (Edge Functions / Server Side) z wykorzystaniem TypeScript.

## 2. Opis konstruktora
Konstruktor usługi powinien przyjmować obiekt konfiguracyjny, aby umożliwić elastyczność w różnych środowiskach (np. testowym).

```typescript
constructor(config: {
  apiKey: string;
  baseUrl?: string; // Domyślnie: https://openrouter.ai/api/v1
  siteUrl?: string; // Wymagane przez OpenRouter dla rankingu (HTTP-Referer)
  siteName?: string; // Wymagane przez OpenRouter (X-Title)
})
```

## 3. Publiczne metody i pola

### Metody:
- `completeChat<T>(params: CompletionParams): Promise<T>`
  Główna metoda do generowania odpowiedzi. Obsługuje typowanie generyczne dla ustrukturyzowanych danych.
- `validateConfig(): boolean`
  Sprawdza, czy klucz API i wymagane nagłówki są poprawne.

### Pola:
- `defaultModel: string` (np. "openai/gpt-4o-mini")
- `defaultTemperature: number` (np. 0.7)

## 4. Prywatne metody i pola

### Metody:
- `#formatMessages(systemPrompt: string, userPrompt: string): Message[]`
  Prywatna metoda pomocnicza budująca tablicę komunikatów.
- `#handleResponse(response: Response): Promise<any>`
  Przetwarzanie statusów HTTP i parsowanie JSON.
- `#getHeaders(): Record<string, string>`
  Generowanie nagłówków wymaganych przez OpenRouter (Authorization, Content-Type, HTTP-Referer, X-Title).

### Pola:
- `#apiKey: string`
- `#baseUrl: string`

## 5. Implementacja kluczowych elementów OpenRouter API

### Komunikat systemowy i użytkownika
Usługa zawsze powinna definiować rolę `system` na początku tablicy `messages`.
```typescript
const messages = [
  { role: 'system', content: systemMessage },
  { role: 'user', content: userMessage }
];
```

### Parametry modelu
Metoda `completeChat` powinna przyjmować opcjonalne parametry: `temperature`, `max_tokens`, `top_p`.

### Nazwa modelu
Zaleca się używanie pełnych nazw modeli (np. `google/gemini-pro-1.5` lub `anthropic/claude-3-haiku`).

### Ustrukturyzowane odpowiedzi (response_format)
Wykorzystanie `json_schema` z trybem `strict: true`.

**Przykład implementacji w usłudze:**
```typescript
const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'data_extraction',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        confidence: { type: 'number' },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['summary', 'confidence', 'tags'],
      additionalProperties: false
    }
  }
};
```

## 6. Obsługa błędów
Usługa musi obsługiwać następujące scenariusze:
1. **401 Unauthorized**: Nieprawidłowy klucz API.
2. **402 Payment Required**: Brak środków na koncie OpenRouter.
3. **429 Too Many Requests**: Przekroczenie limitów (Rate Limit) - wymagany mechanizm retry.
4. **400 Bad Request**: Błąd w schemacie JSON lub nieobsługiwany model.
5. **JSON Parse Error**: Gdy model zwróci nieprawidłowy format mimo wymuszenia schematu.
6. **Timeout**: Przekroczenie czasu połączenia (zalecane użycie `AbortController`).

## 7. Kwestie bezpieczeństwa
- **Zmienne środowiskowe**: Klucz API musi być przechowywany w `process.env.OPENROUTER_API_KEY` i nigdy nie może trafić do przeglądarki (klienta).
- **Walidacja po stronie serwera**: Usługa powinna być wywoływana tylko z poziomu serwera Astro (np. API Routes lub Action).
- **Sanitacja danych**: Mimo że modele są odporne, warto czyścić dane wejściowe użytkownika przed wysłaniem ich do promptu (ochrona przed Prompt Injection).

## 8. Plan wdrożenia krok po kroku

### Krok 1: Konfiguracja środowiska
1. Dodaj `OPENROUTER_API_KEY` do pliku `.env`.
2. Zaktualizuj `src/env.d.ts`, aby uwzględnić nową zmienną środowiskową.

### Krok 2: Definicja typów
Stwórz plik `src/types/openrouter.ts` zawierający interfejsy dla `Message`, `CompletionParams` oraz `OpenRouterResponse`.

### Krok 3: Implementacja klasy bazowej
Utwórz `src/services/OpenRouterService.ts`. Zaimplementuj konstruktor i prywatną metodę `#getHeaders`.

### Krok 4: Implementacja metody completeChat
1. Wykorzystaj `fetch` do wysłania żądania POST.
2. Dodaj obsługę `response_format` zgodnie ze wzorcem `json_schema`.
3. Zaimplementuj logikę `try-catch` dla obsługi błędów sieciowych i API.

### Krok 5: Integracja z Astro
Stwórz przykładowy endpoint w `src/pages/api/generate.ts`, który inicjalizuje usługę i zwraca wynik do frontendu.

### Krok 6: Testy i weryfikacja
1. Przetestuj działanie z modelem domyślnym.
2. Zweryfikuj poprawność parsowania JSON dla ustrukturyzowanych odpowiedzi.
3. Sprawdź zachowanie aplikacji przy braku środków na koncie (błąd 402).
