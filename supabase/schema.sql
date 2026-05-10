create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text,
  location text,
  sunlight text not null default 'Bright indirect',
  watering_interval_days integer not null check (watering_interval_days between 1 and 90),
  fertilizing_enabled boolean not null default false,
  fertilizing_interval_days integer check (fertilizing_interval_days between 7 and 365),
  notes text,
  last_watered_at timestamptz not null default now(),
  last_fertilized_at timestamptz,
  photo_url text,
  reminder_email_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.plants
  add column if not exists fertilizing_enabled boolean not null default false,
  add column if not exists fertilizing_interval_days integer check (fertilizing_interval_days between 7 and 365),
  add column if not exists last_fertilized_at timestamptz;

create table if not exists public.watering_events (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  watered_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.fertilizing_events (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fertilized_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.plant_photos (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email')),
  next_due_at timestamptz not null,
  active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plant_id, channel)
);

alter table public.profiles enable row level security;
alter table public.plants enable row level security;
alter table public.watering_events enable row level security;
alter table public.fertilizing_events enable row level security;
alter table public.plant_photos enable row level security;
alter table public.reminders enable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.plants,
  public.watering_events,
  public.fertilizing_events,
  public.plant_photos,
  public.reminders
to authenticated;

create index if not exists plants_user_created_idx
  on public.plants (user_id, created_at desc);

create index if not exists reminders_due_idx
  on public.reminders (active, channel, next_due_at);

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can read own plants" on public.plants;
drop policy if exists "Users can insert own plants" on public.plants;
drop policy if exists "Users can update own plants" on public.plants;
drop policy if exists "Users can delete own plants" on public.plants;
drop policy if exists "Users can read own watering events" on public.watering_events;
drop policy if exists "Users can insert own watering events" on public.watering_events;
drop policy if exists "Users can read own fertilizing events" on public.fertilizing_events;
drop policy if exists "Users can insert own fertilizing events" on public.fertilizing_events;
drop policy if exists "Users can read own plant photos" on public.plant_photos;
drop policy if exists "Users can insert own plant photos" on public.plant_photos;
drop policy if exists "Users can delete own plant photos" on public.plant_photos;
drop policy if exists "Users can read own reminders" on public.reminders;
drop policy if exists "Users can insert own reminders" on public.reminders;
drop policy if exists "Users can update own reminders" on public.reminders;
drop policy if exists "Users can delete own reminders" on public.reminders;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can read own plants"
  on public.plants for select
  using (auth.uid() = user_id);

create policy "Users can insert own plants"
  on public.plants for insert
  with check (auth.uid() = user_id);

create policy "Users can update own plants"
  on public.plants for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own plants"
  on public.plants for delete
  using (auth.uid() = user_id);

create policy "Users can read own watering events"
  on public.watering_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own watering events"
  on public.watering_events for insert
  with check (auth.uid() = user_id);

create policy "Users can read own fertilizing events"
  on public.fertilizing_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own fertilizing events"
  on public.fertilizing_events for insert
  with check (auth.uid() = user_id);

create policy "Users can read own plant photos"
  on public.plant_photos for select
  using (auth.uid() = user_id);

create policy "Users can insert own plant photos"
  on public.plant_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own plant photos"
  on public.plant_photos for delete
  using (auth.uid() = user_id);

create policy "Users can read own reminders"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "Users can insert own reminders"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reminders"
  on public.reminders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own reminders"
  on public.reminders for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

drop policy if exists "Plant photos are publicly readable" on storage.objects;
drop policy if exists "Users can upload own plant photos" on storage.objects;
drop policy if exists "Users can update own plant photos" on storage.objects;
drop policy if exists "Users can delete own plant photos" on storage.objects;

create policy "Plant photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'plant-photos');

create policy "Users can upload own plant photos"
  on storage.objects for insert
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own plant photos"
  on storage.objects for update
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own plant photos"
  on storage.objects for delete
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace view public.due_email_reminders
with (security_invoker = true) as
select
  reminders.id as reminder_id,
  reminders.plant_id,
  reminders.user_id,
  reminders.next_due_at,
  plants.name as plant_name,
  plants.watering_interval_days,
  profiles.email
from public.reminders
join public.plants on plants.id = reminders.plant_id
join public.profiles on profiles.id = reminders.user_id
where
  reminders.active = true
  and reminders.channel = 'email'
  and reminders.next_due_at <= now()
  and plants.reminder_email_enabled = true;

grant select on public.due_email_reminders to authenticated;
