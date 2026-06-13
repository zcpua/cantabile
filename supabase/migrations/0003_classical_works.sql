-- Canonical classical works library backed by Wikidata + IMSLP.
-- See AGENTS.md for the data flow:
--   sync:wikidata -> wikidata_composers / wikidata_works
--   sync:imslp    -> imslp_people_raw / imslp_works_raw
--   match:classical-works -> classical_works (joined view materialized)

create table public.wikidata_composers (
  qid text primary key,
  name text not null,
  name_zh text,
  birth_date text,
  death_date text,
  country text,
  imslp_category text,
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create table public.wikidata_works (
  qid text primary key,
  composer_qid text not null references public.wikidata_composers(qid) on delete cascade,
  title text not null,
  title_zh text,
  catalog text,
  music_key text,
  genre text,
  inception_year integer,
  imslp_link text,
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create index wikidata_works_composer_qid_idx on public.wikidata_works(composer_qid);
create index wikidata_works_catalog_idx on public.wikidata_works(catalog);

create table public.imslp_people_raw (
  imslp_id text primary key,
  name text,
  permlink text,
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create table public.imslp_works_raw (
  imslp_id text primary key,
  composer_name text,
  work_title text,
  icatno text,
  page_id text,
  permlink text,
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create index imslp_works_raw_composer_name_idx on public.imslp_works_raw(composer_name);
create index imslp_works_raw_icatno_idx on public.imslp_works_raw(icatno);

-- Materialized join: one row per resolved work, with the IMSLP link folded in
-- when matching succeeded. match_confidence describes which rule fired:
--   exact-catalog | exact-link | normalized-title-key | normalized-title-genre | manual
create table public.classical_works (
  id text primary key,
  composer_qid text not null,
  composer_name text not null,
  composer_name_zh text,
  wikidata_qid text not null unique,
  imslp_id text,
  imslp_url text,
  title text not null,
  catalog text,
  music_key text,
  genre text,
  composition_year integer,
  match_confidence text,
  raw_wikidata jsonb,
  raw_imslp jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index classical_works_composer_qid_idx on public.classical_works(composer_qid);
create index classical_works_catalog_idx on public.classical_works(catalog);
create index classical_works_imslp_id_idx on public.classical_works(imslp_id);

create trigger classical_works_set_updated_at
before update on public.classical_works
for each row execute function public.set_updated_at();

alter table public.wikidata_composers enable row level security;
alter table public.wikidata_works enable row level security;
alter table public.imslp_people_raw enable row level security;
alter table public.imslp_works_raw enable row level security;
alter table public.classical_works enable row level security;

create policy "Public can read classical works"
on public.classical_works for select
to anon, authenticated
using (true);

