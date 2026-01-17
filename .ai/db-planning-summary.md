<conversation_summary>
<decisions>
1. Aplikacja będzie korzystać wyłącznie z tabeli `auth.users` dostarczanej przez Supabase; nie zostanie utworzona dodatkowa tabela `public.profiles`.
2. Tabela `projects` będzie zawierać kolumnę `name` do identyfikacji projektu przez użytkownika.
3. Konfiguracje środowisk (Develop, Staging, Production) będą przechowywane w tabeli `projects` jako trzy osobne kolumny typu TEXT.
4. Wyniki analizy AI będą przechowywane w osobnej tabeli `reports` (relacja 1:N z projektem).
5. Do śledzenia metryk sukcesu (KPI) zostanie utworzona osobna tabela `analysis_logs`.
6. Statusy projektu będą obsługiwane przez ENUM (`'DRAFT'`, `'VERIFIED'`).
7. Projekt DEMO będzie zdefiniowany jako hardcoded w kodzie aplikacji ("w pliku aplikacji"), a nie przechowywany w bazie danych.
8. Limity znaków będą egzekwowane przez ograniczenia `CHECK` w bazie danych (10 000 znaków dla konfiguracji, 64 znaki dla nazwy).
9. Usunięcie użytkownika spowoduje kaskadowe usunięcie jego projektów (`ON DELETE CASCADE`).
10. Usunięcie projektu spowoduje kaskadowe usunięcie powiązanych raportów oraz logów analiz (`ON DELETE CASCADE` - decyzja użytkownika nadpisująca rekomendację `SET NULL` dla logów).
11. Row Level Security (RLS) będzie włączone dla wszystkich tabel.
12. Klucze główne w nowych tabelach będą typu `UUID`.
13. Będzie przechowywana pełna historia raportów (relacja 1:N), a aplikacja będzie pobierać najnowszy.
14. Każda edycja konfiguracji automatycznie zresetuje status projektu na `'DRAFT'`.
15. Użytkownik będzie miał uprawnienia tylko do `INSERT` w tabeli `analysis_logs` (bez `SELECT`).
</decisions>

<matched_recommendations>
1. Użycie typu `UUID` dla wszystkich kluczy głównych i obcych.
2. Struktura tabeli `reports` zawierająca kolumny `diff_html` (TEXT) oraz `recommendations` (TEXT).
3. Struktura tabeli `analysis_logs` zawierająca: `id`, `project_id`, `user_id`, `event_type`, `created_at`.
4. Zastosowanie ograniczenia `CHECK (char_length(name) <= 64)` dla nazwy projektu.
5. Zastosowanie ograniczenia `CHECK (char_length(...) <= 10000)` dla pól konfiguracyjnych.
6. Utworzenie indeksów na kolumnach kluczy obcych (`user_id`, `project_id`) dla wydajności RLS.
7. Użycie rozszerzenia `moddatetime` i triggera do automatycznej aktualizacji pola `updated_at`.
8. Implementacja resetowania statusu do `'DRAFT'` za pomocą triggera `BEFORE UPDATE`.
</matched_recommendations>

<database_planning_summary>
Podsumowanie planowania bazy danych dla EnvWatcher MVP:

**Główne założenia:**
Baza danych PostgreSQL hostowana w Supabase będzie prosta i skupiona na bezpiecznym przechowywaniu konfiguracji użytkownika oraz wyników analiz. Autentykacja opiera się w całości na `auth.users` z Supabase.

**Encje i Relacje:**
1.  **Users** (`auth.users`): Zarządzani przez Supabase.
2.  **Projects** (`public.projects`):
    *   Klucz główny: `UUID`.
    *   Relacja: Należy do User (1:N).
    *   Atrybuty: `name` (max 64 znaki), `develop_config`, `staging_config`, `production_config` (max 10k znaków każdy), `status` (ENUM: 'DRAFT', 'VERIFIED'), `created_at`, `updated_at`.
3.  **Reports** (`public.reports`):
    *   Klucz główny: `UUID`.
    *   Relacja: Należy do Project (1:N, `ON DELETE CASCADE`).
    *   Atrybuty: `diff_html` (kod HTML tabeli), `recommendations` (tekst zaleceń), `created_at`.
4.  **Analysis Logs** (`public.analysis_logs`):
    *   Klucz główny: `UUID`.
    *   Relacja: Należy do User (1:N) oraz opcjonalnie do Project (1:N, `ON DELETE CASCADE` - zgodnie z decyzją użytkownika).
    *   Atrybuty: `event_type` (ENUM: 'GENERATED', 'ACCEPTED'), `created_at`.

**Bezpieczeństwo i Skalowalność:**
*   **RLS:** Włączone na wszystkich tabelach. Polityki zapewniają, że użytkownicy widzą i edytują tylko swoje projekty. Tabela logów jest w trybie "write-only" dla użytkownika.
*   **Indeksy:** Wymagane na kluczach obcych (`user_id`, `project_id`) dla optymalizacji zapytań filtrowanych przez RLS.
*   **Integralność:** Triggery dbają o aktualizację `updated_at` oraz resetowanie statusu 'VERIFIED' przy edycji.

**Logika biznesowa w bazie:**
*   Projekt Demo nie istnieje w bazie - jest zaszyty w aplikacji.
*   Historia raportów jest zachowywana, ale aplikacja domyślnie pobiera tylko najnowszy.
</database_planning_summary>
