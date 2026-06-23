#!/usr/bin/env python3
"""Migration script for multi-tenant leagues and sports tables."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from api.league_db import create_leagues_tables


def main():
    print("Starting leagues migration...")
    create_leagues_tables()
    print("Leagues, sports, and league_games tables are ready.")
    return True


if __name__ == "__main__":
    main()
