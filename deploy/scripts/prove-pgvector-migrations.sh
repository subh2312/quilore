#!/usr/bin/env bash
# B6 evidence: run Flyway migrations against a real Postgres+pgvector database.
# Usage (from repo root):
#   bash deploy/scripts/prove-pgvector-migrations.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_NAME="${QUILORE_MIGTEST_DB:-quilore_migtest}"
PGUSER="${POSTGRES_USER:-quilore}"
PGPASSWORD="${POSTGRES_PASSWORD:-quilore_dev_pass}"
PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
export PGPASSWORD

echo "==> Ensuring database ${DB_NAME} exists on ${PGHOST}:${PGPORT}"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT 'ok' WHERE EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}');
SQL

# Create DB if missing
if ! psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "CREATE DATABASE ${DB_NAME};"
fi

echo "==> Dropping public schema for clean migration proof"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL ON SCHEMA public TO public;
SQL

echo "==> Running Flyway via Gradle test (local PG path)"
cd "$ROOT/backend"
export QUILORE_TEST_PG=1
export QUILORE_TEST_PG_URL="jdbc:postgresql://${PGHOST}:${PGPORT}/${DB_NAME}"
export QUILORE_TEST_PG_USER="$PGUSER"
export QUILORE_TEST_PG_PASSWORD="$PGPASSWORD"
./gradlew test --tests 'com.quilore.db.LocalPostgresPgvectorMigrationIT' --no-daemon

echo "==> Schema spot-check"
COUNT="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DB_NAME" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('users','rag_chunks','refresh_sessions')")"
if [[ "${COUNT// /}" -lt 3 ]]; then
  echo "FAIL: expected migrated tables in ${DB_NAME}, found count=${COUNT}" >&2
  exit 1
fi

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
SELECT extname FROM pg_extension WHERE extname IN ('vector','pgcrypto') ORDER BY 1;
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public'
   AND table_name IN ('users','refresh_sessions','rag_chunks','media_objects','sync_records')
 ORDER BY 1;
SELECT format_type(a.atttypid, a.atttypmod)
  FROM pg_attribute a
  JOIN pg_class c ON a.attrelid = c.oid
 WHERE c.relname='rag_chunks' AND a.attname='embedding';
SELECT indexname FROM pg_indexes WHERE indexname='idx_rag_chunks_embedding_hnsw';
SQL

echo "B6 migration evidence: PASS against ${DB_NAME}"
