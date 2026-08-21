#!/usr/bin/env python3
"""Tests for PlayTracker marketing error pages."""

import os
import unittest

ROOT = os.path.dirname(os.path.abspath(__file__))


class ErrorPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from flask import Flask, abort
        from api.error_pages import ERROR_FLAVORS, register_error_pages

        app = Flask(
            __name__,
            template_folder=os.path.join(ROOT, "templates"),
            static_folder=os.path.join(ROOT, "static"),
        )
        app.config["TESTING"] = True
        app.config["SECRET_KEY"] = "test-error-pages"

        @app.context_processor
        def _globals():
            return {"current_year": 2026}

        @app.route("/")
        def index():
            return "ok"

        @app.route("/boom")
        def boom():
            abort(500)

        @app.route("/locked")
        def locked():
            abort(403)

        register_error_pages(app)
        cls.app = app
        cls.flavors = ERROR_FLAVORS

    def setUp(self):
        self.client = self.app.test_client()

    def test_404_uses_playtracker_theme(self):
        response = self.client.get("/nope?play=chess")
        html = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 404)
        self.assertIn("PlayTracker", html)
        self.assertIn("Illegal move", html)
        self.assertIn("in check", html)
        self.assertNotIn("Arbel's Stats", html)
        self.assertIn("Public leagues", html)

    def test_500_pairs_copy_with_icon_flavor(self):
        response = self.client.get("/boom?play=scrabble")
        html = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 500)
        self.assertIn("Challenge", html)
        self.assertIn("Tile bag jammed", html)
        self.assertIn("Try again", html)
        self.assertIn("img/games/scrabble-tile.svg", html)

    def test_cards_flavor_has_misdeal(self):
        response = self.client.get("/missing-page?play=cards")
        html = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 404)
        self.assertIn("Misdeal", html)
        self.assertIn("misdeal", html)
        self.assertIn("mkt-error-fan", html)

    def test_api_stays_json(self):
        response = self.client.get("/api/v1/not-a-route")
        self.assertEqual(response.status_code, 404)
        payload = response.get_json()
        self.assertIsInstance(payload, dict)
        self.assertIn("error", payload)
        self.assertNotIn("PlayTracker", response.get_data(as_text=True))

    def test_arbel_keeps_volleyball_page(self):
        response = self.client.get(
            "/ghost",
            environ_overrides={"SCRIPT_NAME": "/arbel"},
        )
        html = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 404)
        self.assertIn("Out of bounds", html)
        self.assertIn("Ball went long", html)
        self.assertIn("Arbel's Stats", html)

    def test_every_flavor_has_matching_404_and_500_copy(self):
        from api.error_pages import copy_for_flavor, pick_error_flavor

        for flavor in self.flavors:
            with self.subTest(flavor=flavor["id"]):
                self.assertIn(404, flavor["copy"])
                self.assertIn(500, flavor["copy"])
                picked = pick_error_flavor(404, flavor_id=flavor["id"])
                self.assertEqual(picked["kicker"], flavor["kicker"])
                self.assertEqual(picked["title"], flavor["copy"][404]["title"])
                server = copy_for_flavor(flavor, 500)
                self.assertEqual(server["title"], flavor["copy"][500]["title"])

    def test_403_uses_flavor_access_copy(self):
        response = self.client.get("/locked?play=monopoly")
        html = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 403)
        self.assertIn("Just visiting", html)


if __name__ == "__main__":
    unittest.main()
