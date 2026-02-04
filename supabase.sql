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

create table if not exists public.bot_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  tag text not null,
  key_hash text not null unique,
  last4 text not null,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bot_key_audit (
  id uuid primary key default gen_random_uuid(),
  bot_key_id uuid references public.bot_keys(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  action text not null check (action in ('reveal', 'regenerate')),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_bot_keys_updated_at on public.bot_keys;
create trigger set_bot_keys_updated_at
  before update on public.bot_keys
  for each row
  execute function public.set_updated_at();

alter table public.submissions enable row level security;
alter table public.votes enable row level security;
alter table public.bot_keys enable row level security;
alter table public.bot_key_audit enable row level security;

create policy "Public can read submissions" on public.submissions
  for select using (true);

create policy "Authenticated can insert submissions" on public.submissions
  for insert to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated can insert votes" on public.votes
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "No direct access to bot keys" on public.bot_keys
  for all using (false);

create policy "No direct access to bot key audit" on public.bot_key_audit
  for all using (false);

create or replace function public.get_bot_key_public(_user_id uuid)
returns table (
  last4 text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select last4, created_at, updated_at
  from public.bot_keys
  where user_id = _user_id;
$$;

create or replace view public.bot_keys_public as
  select * from public.get_bot_key_public(auth.uid());

grant select on public.bot_keys_public to anon, authenticated;

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
