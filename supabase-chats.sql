-- chats
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  city text not null,
  kind text not null check (kind in ('group','chatbot')),
  platform text not null check (platform in ('telegram','whatsapp','signal','discord','line','kakao','wechat')),
  name text not null,
  url text not null,
  notes text null
);

alter table public.chats enable row level security;

drop policy if exists "Public can read chats" on public.chats;
create policy "Public can read chats"
  on public.chats
  for select
  using (true);

drop policy if exists "Authenticated can submit chats" on public.chats;
create policy "Authenticated can submit chats"
  on public.chats
  for insert
  to authenticated
  with check (true);
