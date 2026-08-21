#!/usr/bin/env python3
"""Copy /arbel photos, vollis, and tennis into PlayTracker leagues for one account."""

from __future__ import annotations

import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SOURCE = os.path.join(ROOT, "-db files", "production-stats-live.db")
DEFAULT_PHOTOS = os.path.join(ROOT, "-db files", "legacy-player-photos")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dest-db",
        help="PlayTracker SQLite file to write to (sets DATABASE_PATH for this run)",
    )
    parser.add_argument(
        "--source-db",
        default=DEFAULT_SOURCE,
        help="Legacy SQLite file to read /arbel tables from",
    )
    parser.add_argument(
        "--photo-dir",
        default=DEFAULT_PHOTOS,
        help="Directory containing legacy player photo files",
    )
    parser.add_argument("--email", default="arbel@meidav.com")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dest_db:
        dest = os.path.abspath(args.dest_db)
        if not os.path.isfile(dest):
            raise SystemExit(f"Destination database not found: {dest}")
        os.environ["DATABASE_PATH"] = dest

    sys.path.insert(0, ROOT)
    from api.legacy_league_import import import_arbel_legacy_bundle
    from db_utils import db_manager

    print(f"Legacy source (read only tables): {os.path.abspath(args.source_db)}")
    print(f"PlayTracker destination:          {db_manager.database_path}")
    print(f"Photo directory:                  {os.path.abspath(args.photo_dir)}")
    print()

    result = import_arbel_legacy_bundle(
        email=args.email,
        source_db=args.source_db,
        photo_dir=args.photo_dir,
        dry_run=args.dry_run,
    )
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
