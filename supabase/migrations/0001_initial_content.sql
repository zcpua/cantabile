create table public.composers (
  id text primary key,
  slug text not null unique,
  name text not null,
  name_cn text not null,
  birth_year integer not null,
  death_year integer,
  country text not null,
  period text not null,
  portrait_url text not null,
  short_bio text not null,
  bio text not null,
  style_tags jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  starter_work_ids jsonb not null default '[]'::jsonb,
  related_composer_ids jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.works (
  id text primary key,
  slug text not null unique,
  composer_id text not null references public.composers(id) on delete cascade,
  title text not null,
  title_cn text not null,
  year integer,
  genre text not null,
  period text not null,
  description text not null,
  movements jsonb not null default '[]'::jsonb,
  listening_links jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.performances (
  id text primary key,
  title text not null,
  city text not null,
  venue text not null,
  starts_at timestamptz not null,
  artists jsonb not null default '[]'::jsonb,
  program jsonb not null default '[]'::jsonb,
  ticket_url text,
  source_url text not null,
  source_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id text primary key,
  slug text not null unique,
  title text not null,
  excerpt text not null,
  cover_url text not null,
  category text not null,
  published_at timestamptz not null,
  content text not null,
  related_composer_ids jsonb not null default '[]'::jsonb,
  related_work_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index composers_period_idx on public.composers(period);
create index composers_country_idx on public.composers(country);
create index composers_featured_idx on public.composers(featured);
create index works_composer_id_idx on public.works(composer_id);
create index works_period_idx on public.works(period);
create index works_genre_idx on public.works(genre);
create index works_featured_idx on public.works(featured);
create index performances_starts_at_idx on public.performances(starts_at);
create index performances_city_idx on public.performances(city);
create index performances_venue_idx on public.performances(venue);
create index articles_published_at_idx on public.articles(published_at);
create index articles_category_idx on public.articles(category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger composers_set_updated_at
before update on public.composers
for each row execute function public.set_updated_at();

create trigger works_set_updated_at
before update on public.works
for each row execute function public.set_updated_at();

create trigger performances_set_updated_at
before update on public.performances
for each row execute function public.set_updated_at();

create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

alter table public.composers enable row level security;
alter table public.works enable row level security;
alter table public.performances enable row level security;
alter table public.articles enable row level security;

create policy "Public can read composers"
on public.composers for select
to anon, authenticated
using (true);

create policy "Public can read works"
on public.works for select
to anon, authenticated
using (true);

create policy "Public can read performances"
on public.performances for select
to anon, authenticated
using (true);

create policy "Public can read articles"
on public.articles for select
to anon, authenticated
using (true);
