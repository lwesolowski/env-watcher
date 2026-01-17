1. **Tabele**

   **Typy pomocnicze i rozszerzenia**
   - `status_enum` ENUM: `'DRAFT'`, `'VERIFIED'`
   - `analysis_event_enum` ENUM: `'GENERATED'`, `'ACCEPTED'`
   - Rozszerzenie `moddatetime` do automatycznej aktualizacji `updated_at`

   **public.projects**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
   - `name` TEXT NOT NULL CHECK (char_length(name) <= 64)
   - `develop_config` TEXT NOT NULL CHECK (char_length(develop_config) <= 10000)
   - `staging_config` TEXT NOT NULL CHECK (char_length(staging_config) <= 10000)
   - `production_config` TEXT NOT NULL CHECK (char_length(production_config) <= 10000)
   - `status` status_enum NOT NULL DEFAULT 'DRAFT'
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
   - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())

   **public.reports**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `project_id` UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE
   - `diff_html` TEXT NOT NULL
   - `recommendations` TEXT NOT NULL
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())

   **public.analysis_logs**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `project_id` UUID REFERENCES public.projects(id) ON DELETE CASCADE
   - `user_id` UUID NOT NULL REFERENCES auth.users(id)
   - `event_type` analysis_event_enum NOT NULL
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())

2. **Relacje**
   - Użytkownik (`auth.users`) 1:N Projekty (`projects`) – `projects.user_id` z `ON DELETE CASCADE`
   - Projekt 1:N Raporty – `reports.project_id` z `ON DELETE CASCADE`
   - Użytkownik 1:N Analizy – `analysis_logs.user_id`
   - Projekt 1:N Analizy (opcjonalne) – `analysis_logs.project_id` z `ON DELETE CASCADE`

3. **Indeksy**
   - `projects_user_id_idx` na `projects(user_id)`
   - `reports_project_id_idx` na `reports(project_id)`
   - `analysis_logs_user_id_idx` na `analysis_logs(user_id)`
   - `analysis_logs_project_id_idx` na `analysis_logs(project_id)`
   - Opcjonalnie: `projects_status_idx` na `projects(status)` dla filtrów KPI

4. **Zasady PostgreSQL (RLS)**
   - RLS włączone dla `projects`, `reports`, `analysis_logs`.
   - `projects`:
     - SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()`
   - `reports`:
     - SELECT/INSERT/DELETE: istnieje projekt z `projects.id = project_id` i `projects.user_id = auth.uid()`
   - `analysis_logs`:
     - INSERT: `user_id = auth.uid()` (write-only dla użytkowników końcowych)
     - SELECT/DELETE: tylko rola serwisowa (np. `auth.role() = 'service_role'`)
   - Alternatywnie doprecyzować polityki Supabase, aby aplikacja mogła czytać raporty poprzez powiązanie z projektem użytkownika.

5. **Dodatkowe uwagi**
   - Trigger `moddatetime` na `projects.updated_at` (np. `CREATE TRIGGER set_moddatetime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);`).
   - Trigger `reset_status_to_draft` BEFORE UPDATE na `projects`, ustawiający `status = 'DRAFT'` gdy zmienia się dowolne pole konfiguracyjne; pomija, jeśli status już `DRAFT`.
   - Historia raportów jest pełna; aplikacja pobiera najnowszy raport per projekt.
   - Projekt demo jest hardcoded w aplikacji i nie występuje w bazie.
   - Tabela users jest obsługiwana przez Supabase Auth.