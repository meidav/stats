#!/usr/bin/env python3
"""Tests for /arbel -> PlayTracker vollis/tennis/photo import."""

import os
import sqlite3
import tempfile
import unittest

ROOT = os.path.dirname(os.path.abspath(__file__))


class LegacyLeagueImportTests(unittest.TestCase):
    def setUp(self):
        handle, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        src_handle, self.source_path = tempfile.mkstemp(suffix=".db")
        os.close(src_handle)
        self.photo_dir = tempfile.mkdtemp()
        os.environ["DATABASE_PATH"] = self.db_path
        os.environ["LEAGUE_PLAYER_UPLOAD_DIR"] = os.path.join(self.photo_dir, "out")

        from db_utils import db_manager

        db_manager.database_path = self.db_path

        from auth import create_user, create_users_table, get_user_by_email
        from api.league_db import add_sport_to_league, create_league, create_leagues_tables
        from api.player_profiles import ensure_player_profile_table

        create_users_table()
        create_leagues_tables()
        ensure_player_profile_table()
        create_user("arbel2", "arbel@meidav.com", "password12", is_admin=False)
        self.user = get_user_by_email("arbel@meidav.com")
        league = create_league(self.user.id, "Arbel's Beach VB", visibility="public", slug="arbels-beach-vb")
        self.beach = add_sport_to_league(league["id"], "beach_volleyball_2s")

        from api.game_db import add_game

        add_game(
            self.beach["id"],
            ["Arbel Meidav", "Joe Woo"],
            ["Rick Brandt", "Anup Khemlani"],
            21,
            19,
            game_date="2026-08-01 12:00:00",
            metadata={"legacy_id": 1, "legacy_source": "games"},
            entered_by=self.user.id,
        )

        self._write_source()

    def _write_source(self):
        conn = sqlite3.connect(self.source_path)
        conn.execute(
            """
            CREATE TABLE vollis_games (
                id INTEGER PRIMARY KEY,
                game_date DATETIME NOT NULL,
                winner TEXT NOT NULL,
                winner_score INTEGER NOT NULL,
                loser TEXT NOT NULL,
                loser_score INTEGER NOT NULL,
                updated_at DATETIME NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE tennis_matches (
                id INTEGER PRIMARY KEY,
                match_date DATETIME NOT NULL,
                winner TEXT NOT NULL,
                winner_score INTEGER NOT NULL,
                loser TEXT NOT NULL,
                loser_score INTEGER NOT NULL,
                updated_at DATETIME NOT NULL,
                set_scores TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE player_profiles (
                name TEXT PRIMARY KEY,
                photo_filename TEXT,
                updated_at DATETIME
            )
            """
        )
        conn.execute(
            "INSERT INTO vollis_games VALUES (1, '2024-01-01 10:00:00', 'Arbel Meidav', 21, 'Anup Khemlani', 14, '2024-01-01 10:00:00')"
        )
        conn.execute(
            "INSERT INTO tennis_matches VALUES (28, '2026-08-18 22:36:00', 'Kevin Gregan', 12, 'Arbel Meidav', 8, '2026-08-19 15:37:04', '6-3, 6-5')"
        )
        jpeg = (
            b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
            b"\xff\xd9"
        )
        photo_name = "anup-khemlani.jpg"
        with open(os.path.join(self.photo_dir, photo_name), "wb") as handle:
            handle.write(jpeg)
        conn.execute(
            "INSERT INTO player_profiles VALUES ('Anup Khemlani', ?, '2026-08-19 19:55:04')",
            (photo_name,),
        )
        conn.commit()
        conn.close()

    def tearDown(self):
        for path in (self.db_path, self.source_path):
            try:
                os.remove(path)
            except OSError:
                pass

    def test_parse_tennis_sets(self):
        from api.legacy_league_import import parse_tennis_set_scores

        self.assertEqual(parse_tennis_set_scores("6-3, 6-5"), [[6, 3], [6, 5]])
        self.assertIsNone(parse_tennis_set_scores(None))

    def test_import_vollis_tennis_and_photos(self):
        from api.legacy_league_import import import_arbel_legacy_bundle
        from api.league_db import get_league_by_slug
        from api.player_profiles import get_player_profile
        from db_utils import db_manager

        result = import_arbel_legacy_bundle(
            email="arbel@meidav.com",
            source_db=self.source_path,
            photo_dir=self.photo_dir,
        )
        self.assertEqual(result["vollis"]["imported"], 1)
        self.assertEqual(result["tennis"]["imported"], 1)
        self.assertTrue(result["vollis"]["league"]["created"])
        self.assertTrue(result["tennis"]["league"]["created"])
        self.assertEqual(result["beach_photos"]["copied"], 1)

        vollis = get_league_by_slug("arbels-vollis")
        tennis = get_league_by_slug("arbels-tennis")
        self.assertEqual(vollis["visibility"], "public")
        self.assertEqual(tennis["visibility"], "unlisted")

        games = db_manager.execute_query(
            "SELECT metadata FROM league_games WHERE sport_id = ?",
            (result["tennis"]["sport_id"],),
        )
        metadata = __import__("json").loads(games[0]["metadata"])
        self.assertEqual(metadata["sets"], [[6, 3], [6, 5]])
        self.assertEqual(metadata["legacy_id"], 28)

        profile = get_player_profile(result["vollis"]["sport_id"], "Anup Khemlani")
        self.assertTrue(profile and profile.get("has_photo"))

        again = import_arbel_legacy_bundle(
            email="arbel@meidav.com",
            source_db=self.source_path,
            photo_dir=self.photo_dir,
        )
        self.assertEqual(again["vollis"]["imported"], 0)
        self.assertEqual(again["vollis"]["skipped"], 1)
        self.assertEqual(again["beach_photos"]["skipped"], 1)


if __name__ == "__main__":
    unittest.main()
