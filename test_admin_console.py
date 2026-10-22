#!/usr/bin/env python3
"""Tests for the dedicated PlayTracker admin console."""

import os
import re
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.abspath(__file__))


def _extract_csrf(html):
    match = re.search(r'name="csrf_token" value="([^"]+)"', html)
    if match:
        return match.group(1)
    match = re.search(r'data-csrf="([^"]+)"', html)
    if match:
        return match.group(1)
    raise AssertionError("csrf_token missing from page")


class AdminConsoleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handle, cls.db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        os.environ["DATABASE_PATH"] = cls.db_path
        sqlite3.connect(cls.db_path).close()

        from db_utils import db_manager

        db_manager.database_path = cls.db_path

        from auth import create_user, create_users_table, get_user_by_email
        from api.league_db import add_sport_to_league, create_league, create_leagues_tables
        from api.admin_data import ensure_admin_schema
        from api.game_db import add_game

        create_users_table()
        create_leagues_tables()
        ensure_admin_schema()
        create_user("root", "root@example.com", "password12", is_admin=True)
        create_user("member", "member@example.com", "password12", is_admin=False)
        cls.admin = get_user_by_email("root@example.com")
        cls.member = get_user_by_email("member@example.com")
        cls.private = create_league(cls.member.id, "Secret Club", visibility="private")
        cls.public = create_league(cls.member.id, "Open Play", visibility="public")
        cls.unlisted = create_league(cls.member.id, "Quiet League", visibility="unlisted")
        private_sport = add_sport_to_league(cls.private["id"], "beach_volleyball_2s")
        add_sport_to_league(cls.public["id"], "tennis_singles")
        recent_game_date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
        older_game_date = (datetime.utcnow() - timedelta(days=14)).strftime("%Y-%m-%d %H:%M:%S")
        add_game(
            private_sport["id"],
            winners=["Ada", "Bea"],
            losers=["Cal", "Dot"],
            winner_score=21,
            loser_score=18,
            game_date=recent_game_date,
            entered_by=cls.member.id,
        )
        for _ in range(4):
            add_game(
                private_sport["id"],
                winners=["Ada", "Bea"],
                losers=["Cal", "Dot"],
                winner_score=21,
                loser_score=19,
                game_date=older_game_date,
                entered_by=cls.member.id,
            )

        from flask import Flask, redirect, render_template
        from api import init_api
        from api.admin_console import init_admin_console

        app = Flask(
            __name__,
            template_folder=os.path.join(ROOT, "templates"),
            static_folder=os.path.join(ROOT, "static"),
        )
        app.config["SECRET_KEY"] = "test-secret-key-for-admin-console-tests"
        app.config["JWT_SECRET_KEY"] = "test-jwt-secret-key-for-admin-console"
        app.config["TESTING"] = True
        app.config["SESSION_COOKIE_SECURE"] = False
        init_api(app)
        init_admin_console(app)

        @app.context_processor
        def _template_globals():
            return {"current_year": 2026}

        @app.route("/login")
        def marketing_login():
            return redirect("/")

        cls.app = app

    @classmethod
    def tearDownClass(cls):
        try:
            os.remove(cls.db_path)
        except OSError:
            pass

    def setUp(self):
        from api.admin_console import reset_login_rate_limit

        reset_login_rate_limit()
        self.client = self.app.test_client()

    def _login_console(self, email="root@example.com", password="password12"):
        page = self.client.get("/admin-console/login")
        csrf = _extract_csrf(page.get_data(as_text=True))
        return self.client.post(
            "/admin-console/login",
            data={"email": email, "password": password, "csrf_token": csrf},
            follow_redirects=False,
        )

    def _json_headers(self):
        page = self.client.get("/admin-console/users")
        csrf = _extract_csrf(page.get_data(as_text=True))
        return {
            "X-CSRF-Token": csrf,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def test_console_requires_login(self):
        response = self.client.get("/admin-console/users")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin-console/login", response.headers["Location"])

    def test_marketing_login_is_not_admin_console(self):
        response = self.client.get("/login")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.headers["Location"].endswith("/"))
        self.assertNotIn("/admin-console/login", response.headers["Location"])

    def test_member_cannot_use_console_login(self):
        response = self._login_console("member@example.com", "password12")
        self.assertEqual(response.status_code, 200)
        self.assertIn("not a super-admin", response.get_data(as_text=True))
        self.assertFalse(any(
            "pt_admin_access=" in item for item in response.headers.getlist("Set-Cookie")
        ))

    def test_admin_login_sets_dedicated_cookie(self):
        response = self._login_console()
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin-console/users", response.headers["Location"])
        cookies = "; ".join(response.headers.getlist("Set-Cookie"))
        self.assertIn("pt_admin_access=", cookies)
        self.assertIn("Path=/admin-console", cookies)
        self.assertIn("pt_admin_csrf=", cookies)
        self.assertTrue(any(item.startswith("pt_admin_access=") for item in response.headers.getlist("Set-Cookie")))

    def test_flask_login_session_does_not_open_console(self):
        with self.client.session_transaction() as sess:
            sess["_user_id"] = str(self.admin.id)
            sess["_fresh"] = True
        response = self.client.get("/admin-console/users")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin-console/login", response.headers["Location"])

    def test_app_jwt_without_admin_audience_is_rejected(self):
        from flask_jwt_extended import create_access_token
        from api.admin_console import ADMIN_ACCESS_COOKIE

        with self.app.app_context():
            token = create_access_token(identity=str(self.admin.id))
        self.client.set_cookie("localhost", ADMIN_ACCESS_COOKIE, token, path="/admin-console")
        response = self.client.get("/admin-console/users")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin-console/login", response.headers["Location"])

    def test_user_overview_shows_private_leagues(self):
        self._login_console()
        response = self.client.get("/admin-console/users")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("member", html)
        self.assertIn("Secret Club", html)
        self.assertIn("private", html)
        self.assertIn("Open Play", html)
        self.assertIn("Quiet League", html)
        self.assertIn("unlisted", html)

    def test_user_detail_lists_all_visibilities(self):
        self._login_console()
        response = self.client.get(f"/admin-console/users/{self.member.id}")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Secret Club", html)
        self.assertIn("Open Play", html)
        self.assertIn("Quiet League", html)
        self.assertIn("Privacy settings do not hide", html)

    def test_league_list_includes_private(self):
        self._login_console()
        response = self.client.get("/admin-console/leagues")
        html = response.get_data(as_text=True)
        self.assertIn("Secret Club", html)
        self.assertIn("Open Play", html)
        self.assertIn("Quiet League", html)

    def test_roadmap_page_loads(self):
        self._login_console()
        response = self.client.get("/admin-console/roadmap")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Roadmap", html)
        self.assertIn("ac-roadmap-board", html)
        self.assertIn("Android parity", html)
        self.assertIn("Subscriptions", html)
        self.assertIn("Recently shipped", html)
        self.assertIn("data-move=", html)

    def test_roadmap_create_move_and_delete(self):
        self._login_console()
        page = self.client.get("/admin-console/roadmap")
        csrf = _extract_csrf(page.get_data(as_text=True))
        headers = {
            "X-CSRF-Token": csrf,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        created = self.client.post(
            "/admin-console/roadmap/items",
            headers=headers,
            json={
                "title": "Interactive board test",
                "status": "idea",
                "category": "platform",
                "effort": "S",
                "summary": "Created by test",
                "details": ["one", "two"],
            },
        )
        self.assertEqual(created.status_code, 200)
        item = created.get_json()
        self.assertEqual(item["title"], "Interactive board test")
        self.assertEqual(item["status"], "idea")
        item_id = item["id"]

        moved = self.client.post(
            f"/admin-console/roadmap/items/{item_id}/move",
            headers=headers,
            json={"direction": "left"},
        )
        self.assertEqual(moved.status_code, 200)
        self.assertEqual(moved.get_json()["status"], "later")

        updated = self.client.post(
            f"/admin-console/roadmap/items/{item_id}",
            headers=headers,
            json={"title": "Interactive board test updated", "premium": True},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertTrue(updated.get_json()["premium"])
        self.assertEqual(updated.get_json()["title"], "Interactive board test updated")

        deleted = self.client.post(
            f"/admin-console/roadmap/items/{item_id}/delete",
            headers=headers,
        )
        self.assertEqual(deleted.status_code, 200)
        self.assertTrue(deleted.get_json()["ok"])

    def test_admin_can_open_private_league(self):
        self._login_console()
        response = self.client.get(f"/admin-console/leagues/{self.private['id']}")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Secret Club", html)
        self.assertIn("private", html)
        self.assertIn("Admin league manager", html)
        self.assertIn("Standings", html)
        self.assertIn("Games", html)
        self.assertIn("Members", html)
        self.assertIn("Danger zone", html)
        self.assertIn("Ada", html)
        self.assertIn("21", html)

    def test_league_sort_and_game_filters(self):
        self._login_console()
        by_games = self.client.get("/admin-console/leagues?sort=games&dir=desc")
        self.assertEqual(by_games.status_code, 200)
        html = by_games.get_data(as_text=True)
        secret_at = html.find("Secret Club")
        open_at = html.find("Open Play")
        self.assertGreater(secret_at, 0)
        self.assertGreater(open_at, 0)
        self.assertLess(secret_at, open_at)

        filtered = self.client.get("/admin-console/leagues?games=5")
        filtered_html = filtered.get_data(as_text=True)
        self.assertIn("Secret Club", filtered_html)
        self.assertNotIn("Open Play", filtered_html)
        self.assertNotIn("Quiet League", filtered_html)

        recent = self.client.get("/admin-console/leagues?recency=7d")
        recent_html = recent.get_data(as_text=True)
        self.assertIn("Secret Club", recent_html)
        self.assertNotIn("Quiet League", recent_html)

        solo = self.client.get("/admin-console/leagues?members=1")
        self.assertEqual(solo.status_code, 200)
        self.assertIn("Secret Club", solo.get_data(as_text=True))

    def test_league_detail_requires_admin_session(self):
        response = self.client.get(f"/admin-console/leagues/{self.private['id']}")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin-console/login", response.headers["Location"])

    def test_public_api_does_not_leak_private_league(self):
        response = self.client.get(f"/api/v1/leagues/{self.private['slug']}")
        self.assertEqual(response.status_code, 403)
        public = self.client.get(f"/api/v1/leagues/{self.public['slug']}")
        self.assertEqual(public.status_code, 200)

    def test_admin_app_jwt_does_not_bypass_private_api(self):
        from flask_jwt_extended import create_access_token

        with self.app.app_context():
            token = create_access_token(identity=str(self.admin.id))
        response = self.client.get(
            f"/api/v1/leagues/{self.private['slug']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 403)

    def test_logout_requires_csrf(self):
        self._login_console()
        response = self.client.post("/admin-console/logout", data={})
        self.assertEqual(response.status_code, 400)

    def test_logout_with_csrf_clears_cookie(self):
        self._login_console()
        page = self.client.get("/admin-console/users")
        csrf = _extract_csrf(page.get_data(as_text=True))
        response = self.client.post(
            "/admin-console/logout",
            data={"csrf_token": csrf},
            follow_redirects=False,
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin-console/login", response.headers["Location"])
        follow = self.client.get("/admin-console/users")
        self.assertEqual(follow.status_code, 302)

    def test_login_rate_limit(self):
        page = self.client.get("/admin-console/login")
        csrf = _extract_csrf(page.get_data(as_text=True))
        for _ in range(5):
            self.client.post(
                "/admin-console/login",
                data={"email": "root@example.com", "password": "wrong-password", "csrf_token": csrf},
            )
        limited = self.client.post(
            "/admin-console/login",
            data={"email": "root@example.com", "password": "wrong-password", "csrf_token": csrf},
        )
        self.assertEqual(limited.status_code, 429)

    def test_cannot_lock_out_last_admin(self):
        from api.admin_data import would_lock_out

        self.assertTrue(would_lock_out(self.admin.id))
        self.assertFalse(would_lock_out(self.member.id))

    def test_admin_host_redirects_home_to_console(self):
        response = self.client.get("/", headers={"Host": "admin.playtracker.org"})
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin-console/", response.headers["Location"])

    def test_admin_host_hides_marketing(self):
        response = self.client.get("/login", headers={"Host": "admin.playtracker.org"})
        self.assertEqual(response.status_code, 404)

    def test_first_login_requires_new_password(self):
        from auth import create_user, get_user_by_email
        from api.admin_data import set_must_change_password

        create_user("tempadmin", "tempadmin@example.com", "admin123", is_admin=True)
        temp = get_user_by_email("tempadmin@example.com")
        set_must_change_password(temp.id, True)

        self._login_console("tempadmin@example.com", "admin123")
        blocked = self.client.get("/admin-console/users")
        self.assertEqual(blocked.status_code, 302)
        self.assertIn("/change-password", blocked.headers["Location"])

        page = self.client.get("/admin-console/change-password")
        self.assertEqual(page.status_code, 200)
        csrf = _extract_csrf(page.get_data(as_text=True))
        reuse = self.client.post(
            "/admin-console/change-password",
            data={
                "csrf_token": csrf,
                "current_password": "admin123",
                "new_password": "admin123",
                "confirm_password": "admin123",
            },
        )
        self.assertEqual(reuse.status_code, 200)
        self.assertIn("temporary", reuse.get_data(as_text=True))

        saved = self.client.post(
            "/admin-console/change-password",
            data={
                "csrf_token": csrf,
                "current_password": "admin123",
                "new_password": "freshpass99",
                "confirm_password": "freshpass99",
            },
        )
        self.assertEqual(saved.status_code, 302)
        opened = self.client.get("/admin-console/users")
        self.assertEqual(opened.status_code, 200)

    def test_zzz_bootstrap_creates_main_admin(self):
        from api.admin_data import ensure_bootstrap_admin, set_user_password, user_requires_password_change
        from auth import get_user_by_email, verify_password

        user = ensure_bootstrap_admin(force=True)
        self.assertIsNotNone(user)
        self.assertEqual(user.email, "arbelmeidav@gmail.com")
        self.assertTrue(user.is_admin)
        self.assertTrue(user_requires_password_change(user.id))
        full = get_user_by_email(user.email)
        self.assertTrue(verify_password(full, "admin123"))
        set_user_password(user.id, "freshpass99", require_change=False)
        ensure_bootstrap_admin(force=True)
        full = get_user_by_email(user.email)
        self.assertTrue(verify_password(full, "freshpass99"))
        self.assertFalse(user_requires_password_change(user.id))

    def test_admin_league_manage_visibility_members_owner_soft_delete(self):
        from auth import create_user, get_user_by_email
        from api.league_db import create_league, get_league_by_id, get_league_by_slug
        from api.admin_league_service import list_league_members, PREVIOUS_OWNER_ROLE

        create_user("helper", "helper@example.com", "password12", is_admin=False)
        helper = get_user_by_email("helper@example.com")
        managed = create_league(self.member.id, "Managed Club", visibility="private")
        self._login_console()
        headers = self._json_headers()
        league_id = managed["id"]

        blocked = self.client.post(
            f"/admin-console/leagues/{league_id}/visibility",
            headers=headers,
            json={"visibility": "public"},
        )
        self.assertEqual(blocked.status_code, 400)

        opened = self.client.post(
            f"/admin-console/leagues/{league_id}/visibility",
            headers=headers,
            json={"visibility": "public", "confirm": True},
        )
        self.assertEqual(opened.status_code, 200)
        self.assertEqual(opened.get_json()["league"]["visibility"], "public")

        added = self.client.post(
            f"/admin-console/leagues/{league_id}/members",
            headers=headers,
            json={"identifier": "helper@example.com", "role": "member"},
        )
        self.assertEqual(added.status_code, 200)
        member_ids = {m["user_id"] for m in added.get_json()["members"]}
        self.assertIn(helper.id, member_ids)

        removed_owner = self.client.post(
            f"/admin-console/leagues/{league_id}/members/{self.member.id}/remove",
            headers=headers,
            json={},
        )
        self.assertEqual(removed_owner.status_code, 400)

        transferred = self.client.post(
            f"/admin-console/leagues/{league_id}/owner",
            headers=headers,
            json={"owner_id": helper.id},
        )
        self.assertEqual(transferred.status_code, 200)
        league = get_league_by_id(league_id)
        self.assertEqual(league["owner_id"], helper.id)
        roles = {m["user_id"]: m["role"] for m in list_league_members(league_id)}
        self.assertEqual(roles[helper.id], "owner")
        self.assertEqual(roles[self.member.id], PREVIOUS_OWNER_ROLE)

        flagged = self.client.post(
            f"/admin-console/leagues/{league_id}/flag",
            headers=headers,
            json={"flag": "test"},
        )
        self.assertEqual(flagged.status_code, 200)
        self.assertEqual(flagged.get_json()["league"]["admin_flag"], "test")

        soft = self.client.post(
            f"/admin-console/leagues/{league_id}/soft-delete",
            headers=headers,
            json={},
        )
        self.assertEqual(soft.status_code, 200)
        self.assertIsNotNone(get_league_by_id(league_id)["deleted_at"])
        self.assertIsNone(get_league_by_slug(managed["slug"]))

        public_gone = self.client.get(f"/api/v1/leagues/{managed['slug']}")
        self.assertIn(public_gone.status_code, (403, 404))

        restored = self.client.post(
            f"/admin-console/leagues/{league_id}/restore",
            headers=headers,
            json={},
        )
        self.assertEqual(restored.status_code, 200)
        self.assertIsNone(get_league_by_id(league_id)["deleted_at"])

    def test_admin_league_hard_delete_requires_confirm(self):
        from api.league_db import create_league, get_league_by_id

        disposable = create_league(self.member.id, "Disposable League", visibility="unlisted")
        self._login_console()
        headers = self._json_headers()
        bad = self.client.post(
            f"/admin-console/leagues/{disposable['id']}/hard-delete",
            headers=headers,
            json={"confirm": "wrong"},
        )
        self.assertEqual(bad.status_code, 400)
        self.assertIsNotNone(get_league_by_id(disposable["id"]))

        ok = self.client.post(
            f"/admin-console/leagues/{disposable['id']}/hard-delete",
            headers=headers,
            json={"confirm": disposable["slug"]},
        )
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(ok.get_json()["deleted"])
        self.assertIsNone(get_league_by_id(disposable["id"]))


if __name__ == "__main__":
    unittest.main()
