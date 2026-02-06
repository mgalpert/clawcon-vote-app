-- jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  city text not null,
  company text not null,
  title text not null,
  location text null,
  url text not null,
  compensation text null,
  notes text null
);

alter table public.jobs enable row level security;

drop policy if exists "Public can read jobs" on public.jobs;
create policy "Public can read jobs"
  on public.jobs
  for select
  using (true);

drop policy if exists "Authenticated can submit jobs" on public.jobs;
create policy "Authenticated can submit jobs"
  on public.jobs
  for insert
  to authenticated
  with check (true);
