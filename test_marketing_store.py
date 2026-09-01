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

        from api.brand import APP_STORE_APP_ID, APP_STORE_URL
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
            from api.brand import APP_STORE_APP_ID, APP_STORE_ITMS_URL, APP_STORE_URL

            return {
                "current_year": date.today().year,
                "app_store_app_id": APP_STORE_APP_ID,
                "app_store_url": APP_STORE_URL,
                "app_store_itms_url": APP_STORE_ITMS_URL,
            }

        @app.route("/")
        def home():
            from flask import render_template

            return render_template("marketing.html")

        register_public_web(app)
        cls.app = app
        cls.app_store_url = APP_STORE_URL
        cls.app_store_app_id = APP_STORE_APP_ID

    def setUp(self):
        self.client = self.app.test_client()

    def test_homepage_links_to_app_store(self):
        response = self.client.get("/")
        html = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.app_store_url, html)
        self.assertIn("itms-apps://apps.apple.com/app/id6803964661", html)
        self.assertIn('app-id=6803964661', html)
        self.assertIn("Now on the App Store", html)
        self.assertIn("marketing-store.js", html)

    def test_homepage_google_play_stays_coming_soon(self):
        response = self.client.get("/")
        html = response.get_data(as_text=True)
        self.assertIn("coming soon", html.lower())
        self.assertIn("is-soon", html)


if __name__ == "__main__":
    unittest.main()
