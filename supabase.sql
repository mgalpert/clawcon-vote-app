create extension if not exists "pgcrypto";

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  presenter_name text not null,
  links text[] null,
  submission_type text not null default 'speaker_demo',
  submitted_by text not null default 'human',
  submitted_for_name text null,
  submitted_for_contact text null,
  created_at timestamptz not null default now(),
  constraint submission_type_check check (submission_type in ('speaker_demo', 'topic')),
  constraint submitted_by_check check (submitted_by in ('human', 'bot', 'bot_on_behalf'))
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (submission_id, user_id)
);

alter table public.submissions enable row level security;
alter table public.votes enable row level security;

create policy "Public can read submissions" on public.submissions
  for select using (true);

create policy "Authenticated can insert submissions" on public.submissions
  for insert to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated can insert votes" on public.votes
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated can read own votes" on public.votes
  for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.get_submissions_with_votes()
returns table (
  id uuid,
  title text,
  description text,
  presenter_name text,
  links text[],
  submission_type text,
  submitted_by text,
  submitted_for_name text,
  created_at timestamptz,
  vote_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id,
    s.title,
    s.description,
    s.presenter_name,
    s.links,
    s.submission_type,
    s.submitted_by,
    s.submitted_for_name,
    s.created_at,
    coalesce(v.vote_count, 0) as vote_count
  from public.submissions s
  left join (
    select submission_id, count(*)::int as vote_count
    from public.votes
    group by submission_id
  ) v on v.submission_id = s.id
  order by coalesce(v.vote_count, 0) desc, s.created_at desc;
$$;

grant execute on function public.get_submissions_with_votes() to anon, authenticated;
