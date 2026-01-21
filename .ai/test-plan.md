### Plan testów dla projektu EnvWatcher

#### 1. Wprowadzenie i cele testowania
- Cel nadrzędny: zweryfikować poprawność, niezawodność i bezpieczeństwo aplikacji EnvWatcher służącej do analizy i porównywania konfiguracji środowisk (Develop/Staging/Production), generowania raportów oraz rekomendacji.
- Cele szczegółowe:
  - Zapewnienie spójności funkcjonalności UI (Astro + React) oraz logiki domenowej (analiza konfiguracji, generowanie tabel raportowych, priorytetyzacja rekomendacji).
  - Walidacja integracji z backendem (Supabase: PostgreSQL, Auth, Realtime/Storage) oraz usługą AI (OpenRouter.ai).
  - Zapewnienie jakości w obszarach wydajności, dostępności, bezpieczeństwa i niezawodności CI/CD (GitHub Actions) oraz wdrożeń (DigitalOcean + Docker).

#### 2. Zakres testów
- Frontend (Astro 5, React 19, TypeScript 5, Tailwind 4, shadcn/ui):
  - Strony i komponenty krytyczne: `src/pages/projects/demo.astro`, `Layout`, `ProjectEditor`, `ReportTable`, `RecommendationsSection`, `UseAsTemplateButton`, `components/ui/*`.
  - Stylowanie i responsywność oraz dostępność (a11y) komponentów shadcn/ui.
- Logika domenowa:
  - Parsowanie i normalizacja danych konfiguracyjnych środowisk.
  - Porównywanie wartości i flagowanie rozbieżności (kolorowanie, priorytety).
  - Generowanie rekomendacji (priorytety: high/medium/low) i ich prezentacja.
- Integracje:
  - Supabase: połączenie, schemat DB, migracje/seed (`supabase/config.toml`, `db.migrations`, `db.seed.sql_paths`), Auth, RLS, Realtime (WebSocket reconnect, race conditions), limity API (`max_rows`).
  - AI (OpenRouter.ai): klucz `OPENROUTER_API_KEY`, limity kosztów/stawek, obsługa błędów, timeouts, retry, degradacja funkcjonalna, cache mechanism (TTL, invalidation, izolacja).
  - MCP server `mcp-servers/10x`: izolacja błędów (crash servera nie kładzie app), fallback/degradacja, timeout handling, kompatybilność wersji `@przeprogramowani/10x-mvp-tracker`, audyt bezpieczeństwa zależności.
- Konfiguracja/środowiska:
  - Zmienne `.env` (`SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`).
  - Profile środowiskowe oraz różnice w konfiguracjach (Develop/Staging/Production).
- CI/CD i hosting:
  - Pipeline GitHub Actions (build, test, lint, typecheck, preview deploy, artefakty).
  - Obraz Docker, konfiguracja DigitalOcean, healthchecki, readiness/liveness, sekrety.

Wyłączenia (out-of-scope) – o ile nie zdefiniowano inaczej: testy penetracyjne zaawansowane (oddzielny engagement), testy długoterminowe obciążeniowe powyżej 24h.

#### 3. Typy testów
- Testy statyczne:
  - Type checking (TypeScript 5).
  - Linting (ESLint/Prettier, Tailwind class sorting – jeśli dostępne).
- Testy jednostkowe:
  - Funkcje parsowania/porównywania konfiguracji, generowania rekomendacji.
  - Komponenty React (z React Testing Library) oraz helpery Astro (Astro test runner / Vitest).
- Testy integracyjne:
  - Integracja komponentów: `ReportTable` + `RecommendationsSection` + źródło danych.
  - Supabase SDK (Auth, zapytania do PostgREST), scenariusze z RLS.
  - Integracja z OpenRouter.ai (mock/stub + testy kontraktowe i limitów).
- Testy E2E (Playwright lub Cypress):
  - Przepływy użytkownika od wejścia na stronę projektu do wygenerowania raportu i przeglądu rekomendacji.
  - Obsługa błędów (brak klucza AI, utrata sieci, brak uprawnień do danych).
- Testy dostępności (a11y):
  - axe-core/Playwright a11y, nawigacja klawiaturą, kontrasty, role ARIA shadcn/ui.
- Testy wydajności:
  - Lighthouse dla stron Astro, TTI/CLS/LCP, koszt hydracji komponentów React.
  - Testy obciążeniowe lekkie dla endpointów Supabase (limity `max_rows`, paginacja).
- Testy bezpieczeństwa:
  - Sekrety i konfiguracja `.env`, brak wycieków do bundla.
  - RLS/ACL dla danych, ochrona przed XSS/CSRF w UI, sanitacja danych raportu HTML.
  - Rate limiting i koszty w OpenRouter.
- Testy regresji i smoke:
  - Zestaw krytycznych ścieżek uruchamiany w CI po każdym PR.

#### 4. Scenariusze testowe dla kluczowych funkcjonalności
- Analiza i porównanie konfiguracji środowisk:
  1. Parsowanie wejść (YAML/INI/tekstowe bloki z wersjami) – poprawne rozpoznanie pól `node`, `postgres`, `redis`, `stripe_api_version` itp.
  2. Normalizacja wersji (np. `16.15.0` vs `16.15`, porównania semver, daty wersji API Stripe).
  3. Wykrywanie rozbieżności: produkcja < staging/develop – oznaczanie kolorem, flagi ostrzeżeń.
  4. Generowanie tabeli raportowej (komórki, headery, kolory, „Source Fragment").
  5. Generowanie rekomendacji: mapowanie różnic na priorytety `high/medium/low`, agregacja, sortowanie po ważności.
  6. Zachowanie read-only trybu DEMO:
     - Weryfikacja immutability danych demonstracyjnych (próba edycji => błąd lub brak akcji).
     - `UseAsTemplateButton` tworzy kopię projektu z właściwymi uprawnieniami użytkownika.
     - Boundary między trybem read-only a edycją – sprawdzenie ACL/RLS.
     - Dane DEMO nie są modyfikowalne przez żadnego użytkownika (nawet admin).
- UI/UX i dostępność:
  1. Render `demo.astro`: tytuł, badge „DEMO MODE”, teksty pomocnicze.
  2. Responsywność (siatki Tailwind) – mobile/desktop, brak przepełnień.
  3. A11y: focus order, role/labelle, kontrast, obsługa klawiaturą, brak pułapek focusu.
- Integracja z Supabase:
  1. Inicjalizacja klienta z `SUPABASE_URL`/`SUPABASE_KEY` – błędny klucz => kontrolowane błędy.
  2. Auth: logowanie/wylogowanie, sesje, odświeżanie tokenów, role (user/admin), egzekwowanie RLS.
  3. Zapytania: paginacja, limity (`max_rows`), sortowanie, indeksy (wydajność), seed danych.
  4. Realtime (jeśli używane):
     - Aktualizacje raportu w UI po zmianach w DB.
     - Race conditions: dwie równoczesne zmiany tego samego rekordu – conflict resolution.
     - Reconnect po utracie połączenia WebSocket – weryfikacja automatycznego ponownego połączenia.
     - Obsługa stale state podczas reconnect (czy UI pokazuje aktualne dane).
- Integracja z OpenRouter.ai:
  1. Brak `OPENROUTER_API_KEY` => komunikat i degradacja funkcjonalna bez blokowania UI.
  2. Błędy sieci/5xx/timeout => retry z backoffem, limit prób, user feedback.
  3. Ochrona kosztów: limity stawek, ograniczenie liczby żądań w oknie czasu, cache wyników (jeśli przewidziano).
  4. Poprawność promptów i walidacja odpowiedzi (schema validation), odporność na „hallucinations".
  5. Cache mechanizm (jeśli zaimplementowany):
     - Invalidacja cache po określonym czasie (TTL).
     - Czy cache działa cross-session i cross-user (izolacja danych).
     - Poprawność cache key generation (parametry zapytania).
     - Limity rozmiaru cache i eviction policy.
- CI/CD i deploy:
  1. Pipeline PR: lint, typecheck, testy jednostkowe/integracyjne, artefakty builda Astro.
  2. Obraz Docker: deterministyczny build, multi-stage, brak sekretów w warstwach, `HEALTHCHECK`.
  3. DigitalOcean: zmienne środowiskowe, migracje Supabase (remote), smoke test po wdrożeniu.
- Bezpieczeństwo:
  1. Weryfikacja, że sekrety nie są bundlowane do frontendu.
  2. XSS: renderowanie `ReportTable` z `htmlContent` – sanitacja i whitelist tagów.
  3. Nagłówki bezpieczeństwa na serwerze (CSP, `X-Frame-Options`, `Referrer-Policy`) – testy E2E.
- MCP server (`mcp-servers/10x`):
  1. Izolacja błędów: weryfikacja, że crash MCP servera nie kładzie całej aplikacji.
  2. Kompatybilność wersji: testowanie z różnymi wersjami `@przeprogramowani/10x-mvp-tracker`.
  3. Fallback/degradacja: aplikacja działa poprawnie gdy MCP server jest niedostępny.
  4. Timeout i retry: obsługa timeoutów przy komunikacji z MCP.
  5. Bezpieczeństwo: audyt zależności MCP servera (`npm audit` dla `mcp-servers/10x/package.json`).

#### 5. Środowisko testowe
- Lokalne:
  - Supabase CLI: DB na porcie `54322`, Studio na `54323`, API `54321`, seed z `supabase/seed.sql` (wg `config.toml`).
  - Plik `.env` z wartościami: `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY` (lub stuby/mocks podczas testów).
  - Node LTS zgodny z projektem (min. 18.x dla dev, zgodnie z demo – testy w wielu wersjach Node jeśli istotne).
  - Test data management:
    - Fixtures dla różnych scenariuszy (projekty z różnymi konfiguracjami, użytkownicy z różnymi rolami).
    - Cleanup hooks – automatyczne czyszczenie stanu DB między testami (truncate/rollback transakcji).
    - Idempotentność – testy E2E używają unikalnych identyfikatorów lub czyszczą po sobie.
    - Factory functions dla generowania test data (np. `createTestProject()`, `createTestUser()`).
- CI:
  - Macierz Node (18.x/20.x), uruchomienie Supabase (usługa) lub testy z mockami.
  - Sekrety CI ustawione w `GitHub Actions Secrets`.
  - Izolowana baza danych dla każdego PR (lub wspólna z automatycznym cleanup).
- Staging/Preview:
  - Preview deploy na DigitalOcean (Docker) z izolowanym Supabase lub udostępnioną instancją testową.

#### 6. Narzędzia do testowania
- Jednostkowe/integracyjne: `Vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@astrojs/test` (jeśli używane), `msw` do stubowania sieci.
- E2E i a11y: `Playwright` (+ `axe-core`), Lighthouse CI.
- Jakość: `ESLint`, `Prettier`, `typescript` (`tsc --noEmit`), `eslint-plugin-astro`, `eslint-plugin-react`, `eslint-plugin-tailwindcss`.
- Bezpieczeństwo: `npm audit`, `semgrep` (opcjonalnie), skan sekretów (np. `gitleaks`).
- CI/CD: GitHub Actions (cache, artefakty, matrix), skan obrazów Docker (`trivy`).

#### 7. Harmonogram testów
- Faza 0 – Setup (3–4 dni): konfiguracja test runnerów (Vitest, Playwright, MSW), dane seed, fixtures, pipeline CI, test data management strategy.
- Faza 1 – Testy statyczne i jednostkowe (3–5 dni): pokrycie kluczowych funkcji porównujących/parsujących, komponenty UI.
- Faza 2 – Integracje (5–7 dni): Supabase + AI (mocki i testy kontraktowe), RLS, Realtime, MCP server, cache.
- Faza 3 – E2E i a11y (3–5 dni): główne scenariusze użytkownika, Lighthouse, flakiness mitigation.
- Faza 4 – Wydajność i bezpieczeństwo (2–3 dni): testy obciążeniowe lekkie, skany bezpieczeństwa.
- Faza 5 – Releasowe (ciągłe): smoke/regresja w CI dla każdego PR, pre-release checklist.

#### 8. Kryteria akceptacji testów
- Jakość kodu: 0 błędów `tsc`, brak błędów krytycznych w ESLint.
- Pokrycie: >= 80% linii/gałęzi dla logiki porównywania i generowania rekomendacji, >= 60% globalnie.
- E2E: 100% przejścia scenariuszy krytycznych (render demo, generacja raportu, rekomendacje, degradacja bez AI).
- A11y: brak poważnych naruszeń axe (severity critical/serious = 0), Lighthouse Accessibility >= 90.
- Wydajność: Lighthouse Performance >= 85 dla kluczowych stron.
- Bezpieczeństwo: brak wycieków sekretów, polityki RLS działają zgodnie z wymaganiami, brak podatności wysokiego ryzyka w `npm audit`/`trivy`.
- Metryki CI/CD:
  - Maksymalny czas wykonania pełnego suite testów w CI: <= 10 minut.
  - Flakiness rate testów E2E: <= 2% (maksymalnie 2 flaky testy na 100 uruchomień).
  - Mean Time To Resolution (MTTR) dla bugów: P0 <= 4h, P1 <= 24h, P2 <= 1 tydzień.

#### 9. Role i odpowiedzialności
- QA Lead: planowanie, priorytetyzacja, definicja kryteriów akceptacji, przegląd raportów.
- QA Engineer: implementacja testów, utrzymanie danych testowych, automatyzacja E2E.
- Dev Frontend: testy jednostkowe komponentów, naprawa defektów UI/a11y.
- Dev Backend/DB: schemat, migracje, RLS, wydajność zapytań, integracja Supabase.
- DevOps: CI/CD, obrazy Docker, bezpieczeństwo buildów, konfiguracja środowisk i sekretów.
- Product Owner: akceptacja UAT, priorytetyzacja rekomendacji.

#### 10. Procedury raportowania błędów
- Kanał: Issues w GitHub + szablony `bug_report.md`.
- Zawartość zgłoszenia: środowisko, wersja, kroki reprodukcji, oczekiwany vs. rzeczywisty rezultat, logi/konsola, zrzuty ekranu/wideo, dane testowe.
- Priorytety: P0 (blokujący prod), P1 (krytyczny), P2 (średni), P3 (niski) – powiązanie z etykietami.
- Reprodukcja i weryfikacja: minimalne repro, zlinkowane testy automatyczne, checklist UAT.
- Retrospektywa defektów cyklicznych: analiza przyczyn (RCA), działania korygujące (testy regresji, lint rules, typy).

#### Załączniki i odwołania techniczne
- Stos technologiczny:
  - Frontend: Astro 5, React 19, TypeScript 5, Tailwind 4, shadcn/ui.
  - Backend: Supabase (PostgreSQL, Auth, Realtime/Storage).
  - AI: OpenRouter.ai.
  - CI/CD: GitHub Actions; Hosting: DigitalOcean (Docker).
- Konfiguracje i pliki istotne:
  - `src/pages/projects/demo.astro` – przykład renderu raportu i rekomendacji.
  - `.env.example` – wymagane sekrety: `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`.
  - `supabase/config.toml` – konfiguracja lokalnego Dev (porty, seed DB, max_rows).
  - `mcp-servers/10x/package.json` – zależność `@przeprogramowani/10x-mvp-tracker` (uwzględnić w audycie bezpieczeństwa).
