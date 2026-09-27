#!/usr/bin/env python3
"""PlayTracker games for Arbel's leagues also land in the /arbel tables."""

import os
import sqlite3
import tempfile
import unittest

from api.legacy_mirror import tennis_set_text


def _legacy_schema(path):
    conn = sqlite3.connect(path)
    conn.execute(
        """
        CREATE TABLE games (
            id INTEGER PRIMARY KEY,
            game_date DATETIME NOT NULL,
            winner1 TEXT NOT NULL,
            winner2 TEXT NOT NULL,
            winner_score INTEGER NOT NULL,
            loser1 TEXT NOT NULL,
            loser2 TEXT NOT NULL,
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
        INSERT INTO games (
            game_date, winner1, winner2, winner_score, loser1, loser2, loser_score, updated_at
        ) VALUES ('2026-08-01 12:00:00', 'Arbel Meidav', 'Joe Woo', 21, 'Rick Brandt', 'Anup Khemlani', 19, '2026-08-01 12:00:00')
        """
    )
    conn.commit()
    conn.close()


class LegacyMirrorTests(unittest.TestCase):
    def setUp(self):
        handle, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        _legacy_schema(self.db_path)
        os.environ["DATABASE_PATH"] = self.db_path

        from db_utils import db_manager

        self.db_manager = db_manager
        self.original_path = db_manager.database_path
        db_manager.database_path = self.db_path

        from auth import create_user, create_users_table, get_user_by_email
        from api.league_db import add_sport_to_league, create_league, create_leagues_tables

        create_users_table()
        create_leagues_tables()
        create_user("mirror", "mirror@example.com", "password12", is_admin=False)
        self.user = get_user_by_email("mirror@example.com")
        beach = create_league(self.user.id, "Arbel's Beach VB", visibility="public", slug="arbels-beach-vb")
        tennis = create_league(self.user.id, "Arbel's Tennis", visibility="unlisted", slug="arbels-tennis")
        vollis = create_league(self.user.id, "Arbel's Vollis", visibility="public", slug="arbels-vollis")
        other = create_league(self.user.id, "Other League", visibility="public", slug="other-league")
        self.beach = add_sport_to_league(beach["id"], "beach_volleyball_2s")
        self.tennis = add_sport_to_league(tennis["id"], "tennis_singles")
        self.vollis = add_sport_to_league(vollis["id"], "vollis")
        self.other = add_sport_to_league(other["id"], "beach_volleyball_2s")

    def tearDown(self):
        self.db_manager.database_path = self.original_path
        os.environ.pop("DATABASE_PATH", None)
        try:
            os.remove(self.db_path)
        except OSError:
            pass

    def _count(self, table):
        conn = sqlite3.connect(self.db_path)
        try:
            return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        finally:
            conn.close()

    def test_new_doubles_game_is_copied_and_edits_follow(self):
        from api.game_db import add_game, delete_game, update_game

        game = add_game(
            self.beach["id"],
            ["Bojan Nisavic", "Luis Sandoval"],
            ["Arbel Meidav", "Craig Mattison"],
            21,
            15,
            game_date="2026-09-24 08:48:00",
            entered_by=self.user.id,
        )
        self.assertEqual(game["metadata"]["legacy_source"], "games")
        self.assertEqual(self._count("games"), 2)

        updated = update_game(
            game["id"],
            loser_score=17,
            metadata={"note": "edited"},
        )
        self.assertEqual(updated["metadata"]["legacy_id"], game["metadata"]["legacy_id"])
        conn = sqlite3.connect(self.db_path)
        row = conn.execute(
            "SELECT loser_score FROM games WHERE id = ?",
            (game["metadata"]["legacy_id"],),
        ).fetchone()
        conn.close()
        self.assertEqual(row[0], 17)

        delete_game(game["id"])
        self.assertEqual(self._count("games"), 1)

    def test_existing_legacy_row_is_linked_not_duplicated(self):
        from api.game_db import add_game

        game = add_game(
            self.beach["id"],
            ["Joe Woo", "Arbel Meidav"],
            ["Anup Khemlani", "Rick Brandt"],
            21,
            19,
            game_date="2026-08-01 12:00:30",
            entered_by=self.user.id,
        )
        self.assertEqual(game["metadata"]["legacy_id"], 1)
        self.assertEqual(self._count("games"), 1)

    def test_imported_game_does_not_insert_another_legacy_row(self):
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
        self.assertEqual(self._count("games"), 1)

    def test_other_leagues_stay_on_playtracker_only(self):
        from api.game_db import add_game

        game = add_game(
            self.other["id"],
            ["A One", "A Two"],
            ["B One", "B Two"],
            21,
            10,
            game_date="2026-09-01 09:00:00",
            entered_by=self.user.id,
        )
        self.assertFalse(game["metadata"])
        self.assertEqual(self._count("games"), 1)

    def test_tennis_and_vollis_copy_scores(self):
        from api.game_db import add_game

        self.assertEqual(tennis_set_text({"sets": [[7, 6]]}), "7-6")
        tennis = add_game(
            self.tennis["id"],
            ["Arbel Meidav"],
            ["Kevin Gregan"],
            13,
            9,
            game_date="2026-09-23 21:35:00",
            metadata={"format": 3, "sets": [[6, 3], [7, 6]]},
            entered_by=self.user.id,
        )
        vollis = add_game(
            self.vollis["id"],
            ["Arbel Meidav"],
            ["Sam Blohowiak"],
            7,
            2,
            game_date="2026-09-22 20:45:00",
            entered_by=self.user.id,
        )
        conn = sqlite3.connect(self.db_path)
        tennis_row = conn.execute(
            "SELECT set_scores, winner, loser FROM tennis_matches WHERE id = ?",
            (tennis["metadata"]["legacy_id"],),
        ).fetchone()
        vollis_row = conn.execute(
            "SELECT winner_score, loser_score FROM vollis_games WHERE id = ?",
            (vollis["metadata"]["legacy_id"],),
        ).fetchone()
        conn.close()
        self.assertEqual(tennis_row[0], "6-3, 7-6")
        self.assertEqual(tennis_row[1], "Arbel Meidav")
        self.assertEqual(tennis_row[2], "Kevin Gregan")
        self.assertEqual(vollis_row, (7, 2))


if __name__ == "__main__":
    unittest.main()
