-- migration: allow users to read their own analysis_logs for user-stats endpoint
-- affected: public.analysis_logs rls policies
-- notes: adds select policies for anon and authenticated roles to enable GET /api/analytics/user-stats

-- add select policy for anon users to read their own analysis logs
create policy analysis_logs_select_anon on public.analysis_logs
for select to anon
using (user_id = auth.uid());

-- add select policy for authenticated users to read their own analysis logs
create policy analysis_logs_select_authenticated on public.analysis_logs
for select to authenticated
using (user_id = auth.uid());
