#!/usr/bin/env python3
"""Tests for PlayTracker marketing App Store links."""

import os
import unittest

ROOT = os.path.dirname(os.path.abspath(__file__))


class MarketingStoreTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from datetime import date

        from flask import Flask

        from api.brand import APP_STORE_APP_ID, APP_STORE_URL, PLAY_STORE_URL
        from api.public_web import register_public_web

        app = Flask(
            __name__,
            template_folder=os.path.join(ROOT, "templates"),
            static_folder=os.path.join(ROOT, "static"),
        )
        app.config["TESTING"] = True
        app.config["SECRET_KEY"] = "test-marketing-store"

        @app.context_processor
        def _globals():
            from api.brand import (
                APP_STORE_APP_ID,
                APP_STORE_ITMS_URL,
                APP_STORE_URL,
                PLAY_STORE_MARKET_URL,
                PLAY_STORE_URL,
            )

            return {
                "current_year": date.today().year,
                "app_store_app_id": APP_STORE_APP_ID,
                "app_store_url": APP_STORE_URL,
                "app_store_itms_url": APP_STORE_ITMS_URL,
                "play_store_url": PLAY_STORE_URL,
                "play_store_market_url": PLAY_STORE_MARKET_URL,
                "app_url": "https://playtracker.org",
                "contact_email": "hello@playtracker.org",
            }

        @app.route("/")
        def home():
            from flask import render_template

            return render_template("marketing.html")

        @app.route("/login")
        def login():
            from flask import redirect

            return redirect("/")

        @app.route("/app")
        def get_app():
            from flask import redirect

            return redirect("/")

        register_public_web(app)
        cls.app = app
        cls.app_store_url = APP_STORE_URL
        cls.app_store_app_id = APP_STORE_APP_ID
        cls.play_store_url = PLAY_STORE_URL

    def setUp(self):
        self.client = self.app.test_client()

    def test_homepage_links_to_app_store(self):
        response = self.client.get("/")
        html = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.app_store_url, html)
        self.assertIn("itms-apps://apps.apple.com/app/id6803964661", html)
        self.assertIn('app-id=6803964661', html)
        self.assertIn("Now on iOS and Android", html)
        self.assertIn(self.play_store_url, html)
        self.assertIn("market://details?id=org.playtracker.app", html)
        self.assertIn("How it works", html)
        self.assertIn("Get PlayTracker", html)
        self.assertIn("Already have PlayTracker? Open the app", html)
        self.assertIn("v1.3.1", html)
        self.assertIn("og:image", html)
        self.assertIn("marketing-store.js", html)

    def test_homepage_google_play_is_live(self):
        response = self.client.get("/")
        html = response.get_data(as_text=True)
        self.assertIn(self.play_store_url, html)
        self.assertIn("mkt-store-link--google", html)
        self.assertNotIn("is-soon", html)
        self.assertNotIn("coming soon", html.lower())

    def test_footer_shows_active_app_store_badge(self):
        response = self.client.get("/")
        html = response.get_data(as_text=True)
        self.assertIn("mkt-footer-stores", html)
        self.assertIn("is-active", html)
        self.assertIn("Public leagues", html)
        self.assertIn("hello@playtracker.org", html)
        self.assertNotIn(">Login<", html)
        self.assertIn("Get the app", html)
        self.assertIn("iPhone and Android", html)
        self.assertGreaterEqual(html.count(self.app_store_url), 3)
        self.assertGreaterEqual(html.count(self.play_store_url), 3)

    def test_login_redirects_to_home(self):
        response = self.client.get("/login")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.headers["Location"].endswith("/"))

    def test_app_alias_redirects_to_home(self):
        response = self.client.get("/app")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.headers["Location"].endswith("/"))


if __name__ == "__main__":
    unittest.main()
