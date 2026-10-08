-- Occasions: initial schema, RLS and storage.
-- Run in the Supabase SQL editor, or `supabase db push`.

create extension if not exists pgcrypto;

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'standard', 'premium')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ───────────────────────── events ─────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  occasion_type text not null check (occasion_type in
    ('wedding','homecoming','engagement','big_girl','birthday','baby_shower','house_warming','dana')),
  title text not null check (length(title) between 1 and 160),
  template_key text not null default 'classic-wedding',
  language_default text not null default 'en' check (language_default in ('en','si','ta')),
  event_date timestamptz,
  venue_name text not null default '' check (length(venue_name) <= 200),
  venue_address text not null default '' check (length(venue_address) <= 400),
  maps_url text not null default '' check (length(maps_url) <= 500),
  story text not null default '' check (length(story) <= 4000),
  cover_image_url text,
  theme jsonb not null default '{}'::jsonb,
  -- Optional per-language overrides: {"si": {"title": "...", "story": "...", "venueName": "...", "venueAddress": "..."}}
  translations jsonb not null default '{}'::jsonb,
  rsvp_enabled boolean not null default true,
  wishes_enabled boolean not null default true,
  is_published boolean not null default false,
  is_private boolean not null default false,          -- unlisted: noindex, left out of sitemap
  password_hash text,                                 -- bcrypt via pgcrypto; never readable by clients
  has_password boolean generated always as (password_hash is not null) stored,
  created_at timestamptz not null default now()
);
create index events_owner_idx on public.events (owner_id);

-- ───────────────────────── child tables ─────────────────────────
create table public.event_sections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null check (length(title) between 1 and 160),
  starts_at timestamptz,
  description text not null default '' check (length(description) <= 1000),
  translations jsonb not null default '{}'::jsonb,
  sort_order int not null default 0
);
create index event_sections_event_idx on public.event_sections (event_id, sort_order);

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);
create index event_photos_event_idx on public.event_photos (event_id, sort_order);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  token text not null unique default encode(gen_random_bytes(9), 'hex'),
  expected_count int not null default 1 check (expected_count between 1 and 50),
  phone text
);
create index guests_event_idx on public.guests (event_id);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guest_id uuid references public.guests (id) on delete set null,
  name text not null check (length(name) between 1 and 120),
  attending boolean not null,
  party_size int not null default 1 check (party_size between 0 and 50),
  meal_preference text not null default 'any' check (meal_preference in ('any','veg','nonveg','none')),
  message text not null default '' check (length(message) <= 500),
  created_at timestamptz not null default now()
);
create index rsvps_event_idx on public.rsvps (event_id, created_at desc);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  message text not null check (length(message) between 1 and 500),
  created_at timestamptz not null default now(),
  is_approved boolean not null default true           -- owners can hide a wish
);
create index wishes_event_idx on public.wishes (event_id, created_at desc);

-- ───────────────────────── helper functions ─────────────────────────
create function public.is_event_owner(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from events where id = p_event and owner_id = auth.uid());
$$;

create function public.is_event_published(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from events where id = p_event and is_published);
$$;

create function public.guest_in_event(p_guest uuid, p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from guests where id = p_guest and event_id = p_event);
$$;

-- Public lookups that must not expose whole tables ----------------------------
create function public.get_guest_by_token(p_slug text, p_token text)
returns table (id uuid, name text, expected_count int)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.expected_count
  from guests g join events e on e.id = g.event_id
  where e.slug = p_slug and e.is_published and g.token = p_token;
$$;

create function public.is_slug_available(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from events where slug = p_slug);
$$;

create function public.event_owner_plan(p_event uuid) returns text
language sql stable security definer set search_path = public as $$
  select p.plan from events e join profiles p on p.id = e.owner_id where e.id = p_event;
$$;

create function public.verify_event_password(p_slug text, p_password text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select password_hash = crypt(p_password, password_hash)
       from events where slug = p_slug and is_published and password_hash is not null),
    false);
$$;

create function public.set_event_password(p_event uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_event_owner(p_event) then raise exception 'not allowed'; end if;
  update events
     set password_hash = case when coalesce(p_password, '') = '' then null
                              else crypt(p_password, gen_salt('bf')) end
   where id = p_event;
end $$;

grant execute on function
  public.get_guest_by_token(text, text), public.is_slug_available(text),
  public.event_owner_plan(uuid), public.verify_event_password(text, text)
  to anon, authenticated;
grant execute on function public.set_event_password(uuid, text) to authenticated;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_sections enable row level security;
alter table public.event_photos enable row level security;
alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.wishes enable row level security;

-- profiles: users see and edit only themselves (plan is changed by admins in SQL).
create policy "own profile read" on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and plan = (select plan from public.profiles where id = auth.uid()));

-- events
create policy "owner all events" on public.events for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "public read published events" on public.events for select using (is_published);

-- Hide password_hash from API clients: select must list columns explicitly (no `*`).
revoke select on public.events from anon, authenticated;
grant select (id, owner_id, slug, occasion_type, title, template_key, language_default, event_date,
  venue_name, venue_address, maps_url, story, cover_image_url, theme, translations, rsvp_enabled,
  wishes_enabled, is_published, is_private, has_password, created_at)
  on public.events to anon, authenticated;

-- sections & photos: owner full access, public read when event published
create policy "owner all sections" on public.event_sections for all
  using (is_event_owner(event_id)) with check (is_event_owner(event_id));
create policy "public read sections" on public.event_sections for select using (is_event_published(event_id));

create policy "owner all photos" on public.event_photos for all
  using (is_event_owner(event_id)) with check (is_event_owner(event_id));
create policy "public read photos" on public.event_photos for select using (is_event_published(event_id));

-- guests: owner only (guests resolve their own link through get_guest_by_token)
create policy "owner all guests" on public.guests for all
  using (is_event_owner(event_id)) with check (is_event_owner(event_id));

-- rsvps: owner reads/deletes; anyone inserts for a published event
create policy "owner read rsvps" on public.rsvps for select using (is_event_owner(event_id));
create policy "owner delete rsvps" on public.rsvps for delete using (is_event_owner(event_id));
create policy "public insert rsvps" on public.rsvps for insert
  with check (is_event_published(event_id) and (guest_id is null or guest_in_event(guest_id, event_id)));

-- wishes: owner full access; public reads approved wishes and inserts for a published event
create policy "owner all wishes" on public.wishes for all
  using (is_event_owner(event_id)) with check (is_event_owner(event_id));
create policy "public read wishes" on public.wishes for select
  using (is_approved and is_event_published(event_id));
create policy "public insert wishes" on public.wishes for insert
  with check (is_event_published(event_id) and is_approved);

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

-- Files live under "<user id>/<random>.webp"; only that user may write there.
create policy "public read event photos" on storage.objects for select
  using (bucket_id = 'event-photos');
create policy "owner upload event photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner delete event photos" on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and (storage.foldername(name))[1] = auth.uid()::text);
