#!/usr/bin/env bash
# Runs the database security tests against a throwaway local Postgres (15+).
# Usage: PGHOST=localhost PGPORT=5432 PGUSER=postgres scripts/test-db.sh
set -euo pipefail
DB=rally_test_$$
cd "$(dirname "$0")/.."
createdb "$DB"
trap 'dropdb "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/stub_auth.sql 2>/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/migrations/20260925000000_init.sql 2>/dev/null
OUT=$(psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/security_test.sql 2>&1 | grep -E 'ok:|FAIL' | sed 's/.*NOTICE:  //')
echo "$OUT"
PASSED=$(echo "$OUT" | grep -c '^ok:' || true)
FAILED=$(echo "$OUT" | grep -c 'FAIL' || true)
echo "---"
echo "$PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
