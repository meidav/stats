#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Persist SQLite on Railway volume; legacy code paths use stats.db in project root.
if [[ -n "${DATABASE_PATH:-}" && "${DATABASE_PATH}" != "stats.db" ]]; then
  mkdir -p "$(dirname "${DATABASE_PATH}")"
  touch "${DATABASE_PATH}"
  ln -sfn "$(realpath "${DATABASE_PATH}")" stats.db
  echo "Linked stats.db -> ${DATABASE_PATH}"
fi

python3 scripts/bootstrap_db.py

exec python3 -m gunicorn stats:app \
  --bind "0.0.0.0:${PORT:-8080}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --threads 4 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
