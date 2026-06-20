#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required.}"
: "${CN_DATABASE_URL:?CN_DATABASE_URL is required.}"

DUMP_FILE="${RUNNER_TEMP:-/tmp}/cantabile-supabase-sync.dump"
DEFAULT_SYNC_TABLES="public.composers public.works public.performances public.articles public.wikidata_composers public.wikidata_works public.imslp_people_raw public.imslp_works_raw public.classical_works"
SYNC_TABLES="${SYNC_TABLES:-$DEFAULT_SYNC_TABLES}"

read -r -a TABLES <<< "${SYNC_TABLES//,/ }"

if [ "${#TABLES[@]}" -eq 0 ]; then
  echo "No tables configured for sync." >&2
  exit 1
fi

PG_DUMP_ARGS=()
TRUNCATE_TABLES=()

for table in "${TABLES[@]}"; do
  if [ -z "$table" ]; then
    continue
  fi

  PG_DUMP_ARGS+=(--table="$table")
  TRUNCATE_TABLES+=("$table")
done

if [ "${#TRUNCATE_TABLES[@]}" -eq 0 ]; then
  echo "No valid tables configured for sync." >&2
  exit 1
fi

TRUNCATE_LIST="$(printf ", %s" "${TRUNCATE_TABLES[@]}")"
TRUNCATE_LIST="${TRUNCATE_LIST:2}"

echo "Dumping ${#TRUNCATE_TABLES[@]} table(s) from overseas Supabase..."
pg_dump "$DATABASE_URL" \
  --data-only \
  --format=custom \
  --no-owner \
  --no-privileges \
  "${PG_DUMP_ARGS[@]}" \
  --file="$DUMP_FILE"

echo "Clearing domestic Supabase tables..."
psql "$CN_DATABASE_URL" \
  --set=ON_ERROR_STOP=1 \
  --command="truncate table $TRUNCATE_LIST restart identity cascade;"

echo "Restoring rows into domestic Supabase..."
pg_restore \
  --data-only \
  --no-owner \
  --no-privileges \
  --dbname="$CN_DATABASE_URL" \
  "$DUMP_FILE"

echo "Supabase data sync complete."
