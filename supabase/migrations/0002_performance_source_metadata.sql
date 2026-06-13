alter table public.performances add column image_url text;
alter table public.performances add column price_label text;
alter table public.performances add column sale_status text;
alter table public.performances add column address text;
alter table public.performances add column intro text;
alter table public.performances add column is_classical boolean;
alter table public.performances add column source_id text;
alter table public.performances add column source_metadata jsonb;

create unique index performances_source_id_unique on public.performances(source_id);
