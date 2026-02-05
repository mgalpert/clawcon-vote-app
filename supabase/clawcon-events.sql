-- ClawCon: multi-event core tables + submission scoping
--
-- Slug rules:
--   claw-<category>-<city>-<year>
--   claw-<category>-<city>-<mon>-<year>  (mon optional; mon in jan|feb|...|dec)

create extension if not exists "pgcrypto";

-- 1) Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  city text not null,
  month text null,
  year int not null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  is_public boolean not null default true,
  created_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint events_month_check check (
    month is null or month in ('jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec')
  ),
  constraint events_slug_check check (
    slug ~ '^claw-[a-z0-9]+-[a-z0-9-]+-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec-)?[0-9]{4}$'
  )
);

alter table public.events enable row level security;

drop policy if exists "Public can read public events" on public.events;
create policy "Public can read public events" on public.events
  for select using (is_public = true);

drop policy if exists "Authenticated can create events" on public.events;
create policy "Authenticated can create events" on public.events
  for insert to authenticated
  with check (auth.uid() is not null);

-- 2) Event organizers (permissions)
create table if not exists public.event_organizers (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'lead',
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_organizers enable row level security;

drop policy if exists "Organizers can read their organizer rows" on public.event_organizers;
create policy "Organizers can read their organizer rows" on public.event_organizers
  for select to authenticated
  using (auth.uid() = user_id);

-- Anyone authenticated can add themselves as organizer for an event they created.
-- (We enforce this via a trigger below; direct insert policy is restricted.)
drop policy if exists "No direct insert into event_organizers" on public.event_organizers;
create policy "No direct insert into event_organizers" on public.event_organizers
  for insert to authenticated
  with check (false);

-- Trigger: on event create, auto-add creator as organizer
create or replace function public.add_creator_as_organizer()
returns trigger as $$
begin
  if new.created_by_user_id is null then
    new.created_by_user_id := auth.uid();
  end if;

  if new.created_by_user_id is not null then
    insert into public.event_organizers(event_id, user_id, role)
    values (new.id, new.created_by_user_id, 'lead')
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path=public;

drop trigger if exists trg_events_add_creator_organizer on public.events;
create trigger trg_events_add_creator_organizer
  after insert on public.events
  for each row
  execute function public.add_creator_as_organizer();

-- 3) Sponsors
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  tier text null,
  url text null,
  logo_url text null,
  blurb text null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sponsors enable row level security;

drop policy if exists "Public can read sponsors for public events" on public.sponsors;
create policy "Public can read sponsors for public events" on public.sponsors
  for select using (
    exists(select 1 from public.events e where e.id = sponsors.event_id and e.is_public = true)
  );

-- Only organizers can manage sponsors
create or replace function public.is_event_organizer(_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.event_organizers eo
    where eo.event_id = _event_id and eo.user_id = auth.uid()
  );
$$;

drop policy if exists "Organizers can insert sponsors" on public.sponsors;
create policy "Organizers can insert sponsors" on public.sponsors
  for insert to authenticated
  with check (public.is_event_organizer(event_id));

drop policy if exists "Organizers can update sponsors" on public.sponsors;
create policy "Organizers can update sponsors" on public.sponsors
  for update to authenticated
  using (public.is_event_organizer(event_id));

drop policy if exists "Organizers can delete sponsors" on public.sponsors;
create policy "Organizers can delete sponsors" on public.sponsors
  for delete to authenticated
  using (public.is_event_organizer(event_id));

-- 4) Scope submissions to an event
alter table public.submissions
  add column if not exists event_id uuid;

-- Default strategy: existing rows (if any) become unscoped until you backfill.
-- For production, backfill then set NOT NULL.

alter table public.submissions
  drop constraint if exists submissions_event_id_fkey;

alter table public.submissions
  add constraint submissions_event_id_fkey
  foreign key (event_id) references public.events(id) on delete cascade;

create index if not exists idx_submissions_event_id_created_at
  on public.submissions(event_id, created_at desc);

-- 5) RPC: submissions + votes filtered by event
create or replace function public.get_submissions_with_votes(_event_slug text)
returns table (
  id uuid,
  event_id uuid,
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
    s.event_id,
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
  join public.events e on e.id = s.event_id
  left join (
    select submission_id, count(*)::int as vote_count
    from public.votes
    group by submission_id
  ) v on v.submission_id = s.id
  where e.slug = _event_slug
  order by
    coalesce(v.vote_count, 0) desc,
    s.created_at desc;
$$;

grant execute on function public.get_submissions_with_votes(text) to anon, authenticated;
