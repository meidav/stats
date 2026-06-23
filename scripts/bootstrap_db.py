#!/usr/bin/env python3
"""Ensure database schema exists on deploy."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from auth import create_users_table
from api.league_db import create_leagues_tables


def main():
    create_users_table()
    create_leagues_tables()
    print("Database bootstrap complete.")


if __name__ == "__main__":
    main()
