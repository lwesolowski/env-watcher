-- migration: create core project/reporting schema with rls
-- affected: enums status_enum, analysis_event_enum; tables public.projects, public.reports, public.analysis_logs
-- notes: includes moddatetime extension, triggers for updated_at and status reset, indexes, and granular rls policies per supabase roles

-- ensure helper extension is present for automatic updated_at maintenance
create extension if not exists moddatetime with schema public;

-- create status_enum if absent
do $$
begin
    if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'status_enum' and n.nspname = 'public') then
        create type public.status_enum as enum ('draft', 'verified');
    end if;
end$$;

-- create analysis_event_enum if absent
do $$
begin
    if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'analysis_event_enum' and n.nspname = 'public') then
        create type public.analysis_event_enum as enum ('generated', 'accepted');
    end if;
end$$;

-- projects table stores per-user environment configurations with size guards
create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(name) <= 64),
    develop_config text not null check (char_length(develop_config) <= 10000),
    staging_config text not null check (char_length(staging_config) <= 10000),
    production_config text not null check (char_length(production_config) <= 10000),
    status public.status_enum not null default 'draft',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- reports table keeps generated diffs and recommendations per project
create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    diff_html text not null,
    recommendations text not null,
    created_at timestamptz not null default timezone('utc', now())
);

-- analysis_logs table records audit trail of analysis actions (write-only for users)
create table if not exists public.analysis_logs (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade,
    user_id uuid not null references auth.users(id),
    event_type public.analysis_event_enum not null,
    created_at timestamptz not null default timezone('utc', now())
);

-- performance helpers per db-plan
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists reports_project_id_idx on public.reports(project_id);
create index if not exists analysis_logs_user_id_idx on public.analysis_logs(user_id);
create index if not exists analysis_logs_project_id_idx on public.analysis_logs(project_id);
create index if not exists projects_status_idx on public.projects(status);

-- trigger to keep updated_at fresh using moddatetime extension
drop trigger if exists set_projects_updated_at_moddatetime on public.projects;
create trigger set_projects_updated_at_moddatetime
before update on public.projects
for each row
execute function moddatetime(updated_at);

-- trigger function to reset status to draft when any config changes
drop function if exists public.set_projects_status_to_draft_on_config_change cascade;
create function public.set_projects_status_to_draft_on_config_change() returns trigger as $$
begin
    if new.status <> 'draft' and (
        old.develop_config is distinct from new.develop_config or
        old.staging_config is distinct from new.staging_config or
        old.production_config is distinct from new.production_config
    ) then
        new.status := 'draft';
    end if;
    return new;
end;
$$ language plpgsql;

-- trigger applying the status reset logic before updates
drop trigger if exists reset_status_to_draft on public.projects;
create trigger reset_status_to_draft
before update on public.projects
for each row
execute function public.set_projects_status_to_draft_on_config_change();

-- enable rls on all tables as required
alter table public.projects enable row level security;
alter table public.reports enable row level security;
alter table public.analysis_logs enable row level security;

-- rls policies for projects: enforce ownership for every supabase role
create policy projects_select_anon on public.projects for select to anon using (user_id = auth.uid());
create policy projects_select_authenticated on public.projects for select to authenticated using (user_id = auth.uid());

create policy projects_insert_anon on public.projects for insert to anon with check (user_id = auth.uid());
create policy projects_insert_authenticated on public.projects for insert to authenticated with check (user_id = auth.uid());

create policy projects_update_anon on public.projects for update to anon using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy projects_update_authenticated on public.projects for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy projects_delete_anon on public.projects for delete to anon using (user_id = auth.uid());
create policy projects_delete_authenticated on public.projects for delete to authenticated using (user_id = auth.uid());

-- rls policies for reports: allow access only through owning project; no update policy to keep history immutable
create policy reports_select_anon on public.reports for select to anon using (
    exists (
        select 1 from public.projects p where p.id = reports.project_id and p.user_id = auth.uid()
    )
);
create policy reports_select_authenticated on public.reports for select to authenticated using (
    exists (
        select 1 from public.projects p where p.id = reports.project_id and p.user_id = auth.uid()
    )
);

create policy reports_insert_anon on public.reports for insert to anon with check (
    exists (
        select 1 from public.projects p where p.id = reports.project_id and p.user_id = auth.uid()
    )
);
create policy reports_insert_authenticated on public.reports for insert to authenticated with check (
    exists (
        select 1 from public.projects p where p.id = reports.project_id and p.user_id = auth.uid()
    )
);

create policy reports_delete_anon on public.reports for delete to anon using (
    exists (
        select 1 from public.projects p where p.id = reports.project_id and p.user_id = auth.uid()
    )
);
create policy reports_delete_authenticated on public.reports for delete to authenticated using (
    exists (
        select 1 from public.projects p where p.id = reports.project_id and p.user_id = auth.uid()
    )
);

-- rls policies for analysis_logs: write-only for end users; read/delete for service role only
create policy analysis_logs_insert_anon on public.analysis_logs for insert to anon with check (user_id = auth.uid());
create policy analysis_logs_insert_authenticated on public.analysis_logs for insert to authenticated with check (user_id = auth.uid());

create policy analysis_logs_select_service_role on public.analysis_logs for select to public using (auth.role() = 'service_role');
create policy analysis_logs_delete_service_role on public.analysis_logs for delete to public using (auth.role() = 'service_role');