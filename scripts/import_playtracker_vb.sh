#!/usr/bin/env bash
# Import legacy doubles VB into a PlayTracker league without touching legacy /arbel data.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${ROOT}/-db files/stats-latest.db"
DEST="${1:-${ROOT}/-db files/production-stats.db}"
EMAIL="${2:-arbel@meidav.com}"

if [[ ! -f "$SOURCE" ]]; then
  echo "Missing legacy source: $SOURCE"
  echo "Copy your latest legacy stats.db there first."
  exit 1
fi

if [[ ! -f "$DEST" ]]; then
  echo "Missing PlayTracker destination DB: $DEST"
  echo ""
  echo "Download the live PlayTracker database first, for example:"
  echo "  cd $ROOT"
  echo "  railway login"
  echo "  railway link"
  echo "  railway volume download /data/stats.db \"-db files/production-stats.db\""
  exit 1
fi

python3 "$ROOT/scripts/import_legacy_doubles_vb.py" \
  --dest-db "$DEST" \
  --source-db "$SOURCE" \
  --email "$EMAIL" \
  --dedupe

echo ""
echo "Next: upload the updated PlayTracker DB back to Railway:"
echo "  railway volume upload /data/stats.db \"$DEST\""
echo ""
echo "Then refresh the PlayTracker app. Legacy /arbel stats were not changed."
