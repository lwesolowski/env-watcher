# Architektura UI dla EnvWatcher

## 1. Przegląd struktury UI

Aplikacja EnvWatcher została zaprojektowana jako narzędzie webowe typu **desktop-first** (zoptymalizowane pod 1280px+, minimum 1024px). Architektura opiera się na prostocie i eliminacji zbędnych elementów nawigacyjnych, koncentrując uwagę użytkownika na zarządzaniu konfiguracjami i analizie raportów AI.

### Główne założenia:
- **Nawigacja**: Minimalistyczny górny pasek (Top Navigation Bar). Brak bocznego menu.
- **Motyw**: Obsługa trybu ciemnego (domyślny) i jasnego z automatyczną detekcją systemową.
- **Układ**: Wertykalny przepływ w edytorze (konfiguracja -> raport) ułatwiający porównywanie danych w jednym widoku.
- **Responsywność**: Blokada widoku dla ekranów poniżej 1024px szerokości.

## 2. Lista widoków

### 2.1 Strona Landing / Auth Guard
- **Nazwa widoku**: Landing Page / Redirect
- **Ścieżka**: `/`
- **Główny cel**: Przekierowanie zalogowanych użytkowników do `/dashboard`, a niezalogowanych do `/login`.
- **Względy bezpieczeństwa**: Wykorzystanie `AuthProvider` (React Context) do weryfikacji stanu sesji przed renderowaniem.

### 2.2 Autentykacja
- **Nazwa widoku**: Login / Register
- **Ścieżka**: `/login`, `/register`
- **Główny cel**: Logowanie i rejestracja użytkowników (Email/Hasło).
- **Kluczowe informacje**: Formularze, komunikaty błędów (np. 401 Unauthorized), stany ładowania.
- **Kluczowe komponenty**: `LoginForm`, `RegisterForm`, `ErrorMessage` (inline), `LoadingButton`.
- **UX/A11y**: Autokoncentracja na pierwszym polu, obsługa klawisza Enter, ARIA-labels dla pól formularza.

### 2.3 Dashboard (Lista Projektów)
- **Nazwa widoku**: Project Dashboard
- **Ścieżka**: `/dashboard`
- **Główny cel**: Zarządzanie listą projektów użytkownika.
- **Kluczowe informacje**: Lista projektów (nazwa, status Draft/Verified, data modyfikacji), przycisk "Create New Project", filtr statusów.
- **Kluczowe komponenty**: 
    - `ProjectList`: Widok listy (nie siatka) z sortowaniem chronologicznym.
    - `ProjectCard`: Zawiera badge statusu, datę relative (np. "2 days ago") i akcje (Edit, Delete).
    - `EmptyState`: Karta z powitaniem, bullet points i dwoma przyciskami (View Demo / Create New).
    - `DeleteConfirmationModal`: Shadcn AlertDialog z wymogiem wpisania nazwy projektu.
- **UX/A11y**: Szkielety (Skeletons) podczas ładowania, optymistyczne aktualizacje przy usuwaniu.

### 2.4 Edytor Projektu i Raport
- **Nazwa widoku**: Project Editor & Report
- **Ścieżka**: `/projects/:id` (oraz `/projects/new` dla nowych)
- **Główny cel**: Wprowadzanie konfiguracji środowisk i analiza wyników AI.
- **Kluczowe informacje**: Trzy pola tekstowe (Develop, Staging, Production), licznik znaków, status projektu, tabela różnic AI, rekomendacje.
- **Kluczowe komponenty**:
    - `ConfigForm`: 3x Textarea z monospace fontem i dynamicznym licznikiem znaków (9k warning, 10k error).
    - `GenerateReportButton`: Z tooltipem wyjaśniającym blokadę przy błędach walidacji.
    - `ReportOverlay`: Ekran ładowania AI z progresywnymi komunikatami (np. "Analyzing...").
    - `ReportTable`: Wrapper sanitujący HTML (DOMPurify) z kolumną "Source Fragment".
    - `RecommendationsSection`: Accordion dla długich list z ikonami priorytetów.
    - `StickyReportHeader`: Pasek z przyciskami "Accept Report" i "Regenerate" widoczny podczas scrollowania.
- **Bezpieczeństwo**: Sanityzacja danych wyjściowych z AI, zapobieganie XSS.

### 2.5 Projekt Demo
- **Nazwa widoku**: Demo Project
- **Ścieżka**: `/projects/demo`
- **Główny cel**: Prezentacja możliwości aplikacji bez konieczności zakładania konta/wprowadzania danych.
- **Kluczowe informacje**: Predefiniowane dane w trybie read-only, badge "DEMO PROJECT".
- **Kluczowe komponenty**: Podobne do edytora, ale z przyciskiem "Use as Template" zamiast "Save Draft".

## 3. Mapa podróży użytkownika

### Główny przypadek użycia: Analiza spójności środowisk
1. **Wejście**: Użytkownik loguje się i trafia na `/dashboard`.
2. **Tworzenie**: Klika "Create New Project" -> przeniesienie do `/projects/new`.
3. **Wprowadzanie**: Wkleja konfiguracje do pól Develop, Staging, Production.
4. **Zapis**: Klika "Save Draft" (zapobiega utracie danych przed analizą).
5. **Analiza**: Klika "Generate Report" -> pojawia się nakładka ładowania -> po ~15s następuje płynne przewinięcie do raportu.
6. **Weryfikacja**: Przegląda tabelę różnic, najeżdża na tooltipy w "Source Fragment", czyta rekomendacje.
7. **Akceptacja**: Klika "Accept Report" w sticky headerze -> status projektu zmienia się na "Verified".
8. **Powrót**: Wraca do `/dashboard`, gdzie widzi projekt z zielonym badgem statusu.

## 4. Układ i struktura nawigacji

### Top Navigation Bar (zawsze widoczny):
- **Logo (lewa)**: Kliknięcie przenosi do `/dashboard`.
- **User Actions (prawa)**: Nazwa/Email użytkownika, przełącznik motywu (Dark/Light), przycisk "Logout".

### Mechanizmy nawigacji:
- **Breadcrumbs (opcjonalnie)**: "Projects > Project Name" dla łatwego powrotu.
- **Redirects**: Automatyczny powrót do `/dashboard` po usunięciu projektu.
- **Unsaved Changes**: Browser confirmation dialog przy próbie wyjścia z edytora bez zapisu zmian.

## 5. Kluczowe komponenty

- **`ThemeToggle`**: Przełącznik motywów synchronizowany z `localStorage` i preferencjami systemu.
- **`StatusBadge`**: Komponent wyświetlający status (Draft/Verified) z odpowiednim kolorem i ikoną.
- **`CharacterCounter`**: Wskaźnik wizualny (0-10,000) zmieniający kolor przy zbliżaniu się do limitu.
- **`ReportTable`**: Wyspecjalizowany render tabeli HTML z obsługą horizontal scroll i podświetlaniem fragmentów źródłowych.
- **`AuthGuard`**: Komponent wyższego rzędu (HOC) lub Wrapper chroniący ścieżki przed nieautoryzowanym dostępem.
- **`ToastProvider`**: System powiadomień dla błędów API, sukcesów zapisu i powiadomień o wygaśnięciu sesji.
