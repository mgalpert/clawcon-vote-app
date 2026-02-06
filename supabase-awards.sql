-- awards
create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  city text not null,
  kind text not null check (kind in ('prize','grant','challenge','bounty')),
  sponsor_name text not null,
  title text not null,
  description text not null,
  url text null,
  amount text null
);

alter table public.awards enable row level security;

drop policy if exists "Public can read awards" on public.awards;
create policy "Public can read awards"
  on public.awards
  for select
  using (true);

drop policy if exists "Authenticated can submit awards" on public.awards;
create policy "Authenticated can submit awards"
  on public.awards
  for insert
  to authenticated
  with check (true);
