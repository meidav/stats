#!/usr/bin/env python3
"""Copy legacy beach volleyball doubles (games table) into a PlayTracker league sport.

Reads from a separate legacy SQLite file only. Never modifies the legacy games table
in the destination database.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(__file__))
DEFAULT_SOURCE = os.path.join(ROOT, "-db files", "stats-latest.db")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dest-db",
        help="PlayTracker SQLite file to write to (sets DATABASE_PATH for this run)",
    )
    parser.add_argument(
        "--source-db",
        default=DEFAULT_SOURCE,
        help=f"Legacy SQLite file to read games from (default: {DEFAULT_SOURCE})",
    )
    parser.add_argument(
        "--email",
        default="arbel@meidav.com",
        help="PlayTracker owner email",
    )
    parser.add_argument(
        "--league-slug",
        help="Target league slug. If omitted, uses the only beach VB league for this user.",
    )
    parser.add_argument(
        "--sport-id",
        type=int,
        help="Target sport id (overrides email/league lookup)",
    )
    parser.add_argument(
        "--dedupe",
        action="store_true",
        help="Delete duplicate beach VB leagues, keeping the one with the most games.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would happen without writing.",
    )
    args = parser.parse_args()

    if args.dest_db:
        dest = os.path.abspath(args.dest_db)
        if not os.path.isfile(dest):
            raise SystemExit(f"Destination database not found: {dest}")
        os.environ["DATABASE_PATH"] = dest

    sys.path.insert(0, ROOT)
    from api.legacy_vb_import import import_legacy_doubles_vb
    from db_utils import db_manager

    print(f"Legacy source (read only): {os.path.abspath(args.source_db)}")
    print(f"PlayTracker destination:   {db_manager.database_path}")
    print("Legacy /arbel games table in the destination DB is not modified.")
    print()

    result = import_legacy_doubles_vb(
        email=args.email,
        source_db=args.source_db,
        league_slug=args.league_slug,
        sport_id=args.sport_id,
        dedupe=args.dedupe,
        dry_run=args.dry_run,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
