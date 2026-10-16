"""Tests for the Reddit OAuth lead collector and subreddit monitoring."""

import os
import unittest
from unittest.mock import MagicMock, patch

from app.services.social_sources import (
    SourceUnavailable,
    check_connection,
    collect_from_source,
    collect_reddit,
    is_relevant_post,
    parse_subreddits,
    source_readiness,
)


class TestRedditCollector(unittest.TestCase):
    """Test suite for Reddit collection, parsing, relevance, and error isolation."""

    def test_parse_subreddits(self) -> None:
        """Verify parsing and normalization of subreddit lists."""
        self.assertEqual(parse_subreddits(None), [])
        self.assertEqual(parse_subreddits(""), [])
        self.assertEqual(parse_subreddits("   "), [])
        self.assertEqual(parse_subreddits("ahmedabad"), ["ahmedabad"])
        self.assertEqual(
            parse_subreddits("ahmedabad, gandhinagar"),
            ["ahmedabad", "gandhinagar"],
        )
        self.assertEqual(
            parse_subreddits("r/ahmedabad, /r/gandhinagar, R/Gujarat"),
            ["ahmedabad", "gandhinagar", "gujarat"],
        )
        self.assertEqual(
            parse_subreddits("ahmedabad, r/ahmedabad, AHMEDABAD"),
            ["ahmedabad"],
        )
        self.assertEqual(
            parse_subreddits("r/, /r/, , ahmedabad"),
            ["ahmedabad"],
        )

    def test_is_relevant_post(self) -> None:
        """Verify city and real-estate relevance filtering."""
        # Relevant post with city and property terms
        self.assertTrue(
            is_relevant_post("Looking for 2BHK flat in Ahmedabad for rent", "Ahmedabad")
        )
        # Irrelevant post in Ahmedabad with no property terms
        self.assertFalse(
            is_relevant_post("Best food and restaurants in Ahmedabad?", "Ahmedabad")
        )
        # Post with property terms but no city in text
        self.assertFalse(
            is_relevant_post("Need a 2BHK apartment with balcony", "Ahmedabad")
        )
        # Post with property terms and city satisfied via subreddit context
        self.assertTrue(
            is_relevant_post(
                "Need a 2BHK apartment with balcony for rent",
                "Ahmedabad",
                context="ahmedabad",
            )
        )
        # Post with property terms and non-matching subreddit context
        self.assertFalse(
            is_relevant_post(
                "Need a 2BHK apartment with balcony for rent",
                "Ahmedabad",
                context="mumbai",
            )
        )

    @patch("app.services.social_sources._http_json")
    def test_collect_reddit_multiple_subreddits(self, mock_http: MagicMock) -> None:
        """Verify collection from multiple configured subreddits."""
        env = {
            "REDDIT_CLIENT_ID": "client_123",
            "REDDIT_CLIENT_SECRET": "secret_456",
            "REDDIT_SUBREDDITS": "r/ahmedabad, gandhinagar",
        }

        def fake_http(url: str, **_kwargs):
            if "access_token" in url:
                return {"access_token": "token_xyz"}
            if "/r/ahmedabad/new" in url:
                return {
                    "data": {
                        "children": [
                            {
                                "data": {
                                    "id": "post_ahm_1",
                                    "title": "2BHK flat for rent in Satellite",
                                    "selftext": "Fully furnished, 25k monthly rent.",
                                    "author": "rahul_patel",
                                    "permalink": "/r/ahmedabad/comments/post_ahm_1/2bhk_flat/",
                                    "created_utc": 1712000000.0,
                                    "subreddit": "ahmedabad",
                                }
                            }
                        ]
                    }
                }
            if "/r/gandhinagar/new" in url:
                return {
                    "data": {
                        "children": [
                            {
                                "data": {
                                    "id": "post_gnd_1",
                                    "title": "House for sale in Gandhinagar",
                                    "selftext": "3BHK near Infocity, contact broker.",
                                    "author": "kiran_shah",
                                    "permalink": "/r/gandhinagar/comments/post_gnd_1/house/",
                                    "created_utc": 1712000100.0,
                                    "subreddit": "gandhinagar",
                                }
                            }
                        ]
                    }
                }
            return {"data": {"children": []}}

        mock_http.side_effect = fake_http

        with patch.dict(os.environ, env, clear=True):
            leads = collect_reddit("Ahmedabad")
            self.assertEqual(len(leads), 1)
            lead = leads[0]
            self.assertEqual(lead["source_post_id"], "post_ahm_1")
            self.assertEqual(lead["subreddit"], "ahmedabad")
            self.assertEqual(lead["author"], "rahul_patel")
            self.assertEqual(lead["source_url"], "https://www.reddit.com/r/ahmedabad/comments/post_ahm_1/2bhk_flat/")
            self.assertEqual(lead["posted_at"], 1712000000.0)
            self.assertEqual(lead["collection_mode"], "subreddit")
            self.assertIn("2BHK flat for rent in Satellite", lead["raw_text"])
            self.assertIn("Fully furnished, 25k monthly rent.", lead["raw_text"])

    @patch("app.services.social_sources._http_json")
    def test_collect_reddit_filters_irrelevant_posts(self, mock_http: MagicMock) -> None:
        """Verify irrelevant posts in a monitored subreddit are discarded."""
        env = {
            "REDDIT_CLIENT_ID": "client_123",
            "REDDIT_CLIENT_SECRET": "secret_456",
            "REDDIT_SUBREDDITS": "ahmedabad",
        }

        mock_http.side_effect = [
            {"access_token": "mock_token"},
            {
                "data": {
                    "children": [
                        {
                            "data": {
                                "id": "relevant_1",
                                "title": "Room available for rent",
                                "selftext": "Single room in 3BHK flat near Vastrapur.",
                                "author": "user_a",
                                "created_utc": 1712000000.0,
                                "subreddit": "ahmedabad",
                            }
                        },
                        {
                            "data": {
                                "id": "irrelevant_1",
                                "title": "Weekend cricket meetup",
                                "selftext": "Anyone up for cricket on Sunday morning?",
                                "author": "user_b",
                                "created_utc": 1712000010.0,
                                "subreddit": "ahmedabad",
                            }
                        },
                    ]
                }
            },
        ]

        with patch.dict(os.environ, env, clear=True):
            leads = collect_reddit("Ahmedabad")
            self.assertEqual(len(leads), 1)
            self.assertEqual(leads[0]["source_post_id"], "relevant_1")

    @patch("app.services.social_sources._http_json")
    def test_collect_reddit_deduplicates_duplicate_posts(self, mock_http: MagicMock) -> None:
        """Verify duplicate posts across subreddits are deduplicated by post ID."""
        env = {
            "REDDIT_CLIENT_ID": "client_123",
            "REDDIT_CLIENT_SECRET": "secret_456",
            "REDDIT_SUBREDDITS": "sub_a, sub_b",
        }

        same_post = {
            "id": "cross_post_1",
            "title": "Ahmedabad 2BHK flat available for rent",
            "selftext": "Located in Prahlad Nagar, rent 22000.",
            "author": "owner123",
            "created_utc": 1712000000.0,
            "subreddit": "sub_a",
        }

        mock_http.side_effect = [
            {"access_token": "token"},
            {"data": {"children": [{"data": same_post}]}},
            {"data": {"children": [{"data": same_post}]}},
        ]

        with patch.dict(os.environ, env, clear=True):
            leads = collect_reddit("Ahmedabad")
            self.assertEqual(len(leads), 1)
            self.assertEqual(leads[0]["source_post_id"], "cross_post_1")

    @patch("app.services.social_sources._http_json")
    def test_collect_reddit_missing_optional_fields(self, mock_http: MagicMock) -> None:
        """Verify missing selftext, deleted author, and absent permalink are handled cleanly."""
        env = {
            "REDDIT_CLIENT_ID": "client_123",
            "REDDIT_CLIENT_SECRET": "secret_456",
            "REDDIT_SUBREDDITS": "ahmedabad",
        }

        mock_http.side_effect = [
            {"access_token": "token"},
            {
                "data": {
                    "children": [
                        {
                            "data": {
                                "id": "deleted_author_post",
                                "title": "Looking for 1BHK apartment for rent in Ahmedabad",
                                "selftext": "",
                                "author": "[deleted]",
                                "permalink": None,
                                "created_utc": 1712000000.0,
                                "subreddit": "ahmedabad",
                            }
                        }
                    ]
                }
            },
        ]

        with patch.dict(os.environ, env, clear=True):
            leads = collect_reddit("Ahmedabad")
            self.assertEqual(len(leads), 1)
            lead = leads[0]
            self.assertIsNone(lead["author"])
            self.assertIsNone(lead["source_url"])
            self.assertEqual(lead["raw_text"], "Looking for 1BHK apartment for rent in Ahmedabad")

    @patch("app.services.social_sources._http_json")
    def test_single_subreddit_failure_does_not_abort_others(self, mock_http: MagicMock) -> None:
        """Verify failure in one subreddit allows subsequent subreddits to succeed."""
        env = {
            "REDDIT_CLIENT_ID": "client_123",
            "REDDIT_CLIENT_SECRET": "secret_456",
            "REDDIT_SUBREDDITS": "private_sub, ahmedabad",
        }

        def fake_http(url: str, **_kwargs):
            if "access_token" in url:
                return {"access_token": "token"}
            if "/r/private_sub/new" in url:
                raise SourceUnavailable("Source API returned HTTP 403: Forbidden")
            if "/r/ahmedabad/new" in url:
                return {
                    "data": {
                        "children": [
                            {
                                "data": {
                                    "id": "valid_post_1",
                                    "title": "Flat for lease in Ahmedabad",
                                    "selftext": "3BHK fully furnished apartment",
                                    "author": "broker_raj",
                                    "created_utc": 1712000000.0,
                                    "subreddit": "ahmedabad",
                                }
                            }
                        ]
                    }
                }
            return {"data": {"children": []}}

        mock_http.side_effect = fake_http

        errors: list[dict[str, str]] = []
        with patch.dict(os.environ, env, clear=True):
            leads = collect_reddit("Ahmedabad", errors=errors)
            self.assertEqual(len(leads), 1)
            self.assertEqual(leads[0]["source_post_id"], "valid_post_1")
            self.assertEqual(len(errors), 1)
            self.assertEqual(errors[0]["source"], "reddit")
            self.assertIn("private_sub", errors[0]["message"])
            self.assertIn("HTTP 403", errors[0]["message"])

    @patch("app.services.social_sources._http_json")
    def test_all_subreddits_fail_raises_when_no_errors_collector(self, mock_http: MagicMock) -> None:
        """Verify SourceUnavailable is raised if all subreddits fail and no errors list is provided."""
        env = {
            "REDDIT_CLIENT_ID": "client_123",
            "REDDIT_CLIENT_SECRET": "secret_456",
            "REDDIT_SUBREDDITS": "broken_sub",
        }

        mock_http.side_effect = [
            {"access_token": "token"},
            SourceUnavailable("Source API returned HTTP 404: Not Found"),
        ]

        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(SourceUnavailable) as ctx:
                collect_reddit("Ahmedabad")
            self.assertIn("broken_sub", str(ctx.exception))

    @patch("app.services.social_sources._http_json")
    def test_global_search_fallback_when_no_subreddits_configured(self, mock_http: MagicMock) -> None:
        """Verify fallback to global search when REDDIT_SUBREDDITS is not set."""
        env = {
            "REDDIT_CLIENT_ID": "client_123",
            "REDDIT_CLIENT_SECRET": "secret_456",
        }

        called_urls: list[str] = []

        def fake_http(url: str, **_kwargs):
            called_urls.append(url)
            if "access_token" in url:
                return {"access_token": "token"}
            return {
                "data": {
                    "children": [
                        {
                            "data": {
                                "id": "search_res_1",
                                "title": "Ahmedabad 2BHK flat available for rent",
                                "selftext": "Near SG Highway, 20k/month.",
                                "author": "search_user",
                                "permalink": "/r/india/comments/search_res_1/flat/",
                                "created_utc": 1712000000.0,
                                "subreddit": "india",
                            }
                        }
                    ]
                }
            }

        mock_http.side_effect = fake_http

        with patch.dict(os.environ, env, clear=True):
            leads = collect_reddit("Ahmedabad")
            self.assertEqual(len(leads), 1)
            self.assertEqual(leads[0]["collection_mode"], "global_search")
            self.assertEqual(leads[0]["source_post_id"], "search_res_1")
            self.assertTrue(any("oauth.reddit.com/search" in u for u in called_urls))

    @patch("app.services.social_sources._http_json")
    def test_collect_from_source_passes_errors(self, mock_http: MagicMock) -> None:
        """Verify collect_from_source passes errors through to collect_reddit."""
        env = {
            "REDDIT_CLIENT_ID": "client_123",
            "REDDIT_CLIENT_SECRET": "secret_456",
            "REDDIT_SUBREDDITS": "nonexistent_sub",
        }

        mock_http.side_effect = [
            {"access_token": "token"},
            SourceUnavailable("HTTP 404"),
        ]

        errors: list[dict[str, str]] = []
        with patch.dict(os.environ, env, clear=True):
            leads = collect_from_source("reddit", "Ahmedabad", errors=errors)
            self.assertEqual(leads, [])
            self.assertEqual(len(errors), 1)
            self.assertIn("nonexistent_sub", errors[0]["message"])

    @patch("app.services.social_sources._http_json")
    def test_check_connection_modes(self, mock_http: MagicMock) -> None:
        """Verify connection check reports active mode."""
        mock_http.return_value = {"access_token": "token", "data": {"children": []}}

        # With subreddits
        with patch.dict(
            os.environ,
            {
                "REDDIT_CLIENT_ID": "c",
                "REDDIT_CLIENT_SECRET": "s",
                "REDDIT_SUBREDDITS": "r/ahmedabad, gandhinagar",
            },
            clear=True,
        ):
            msg = check_connection("reddit")
            self.assertIn("mode: subreddits [r/ahmedabad, r/gandhinagar]", msg)

        # Without subreddits (fallback)
        with patch.dict(
            os.environ,
            {"REDDIT_CLIENT_ID": "c", "REDDIT_CLIENT_SECRET": "s"},
            clear=True,
        ):
            msg = check_connection("reddit")
            self.assertIn("mode: global_search fallback", msg)

    def test_source_readiness_modes(self) -> None:
        """Verify source readiness reports configured subreddit status."""
        with patch.dict(
            os.environ,
            {
                "REDDIT_CLIENT_ID": "c",
                "REDDIT_CLIENT_SECRET": "s",
                "REDDIT_SUBREDDITS": "ahmedabad",
            },
            clear=True,
        ):
            ready = source_readiness()
            self.assertTrue(ready["reddit"]["ready"])
            self.assertEqual(ready["reddit"]["mode"], "subreddit")
            self.assertIn("monitoring: r/ahmedabad", ready["reddit"]["message"])

        with patch.dict(
            os.environ,
            {"REDDIT_CLIENT_ID": "c", "REDDIT_CLIENT_SECRET": "s"},
            clear=True,
        ):
            ready = source_readiness()
            self.assertTrue(ready["reddit"]["ready"])
            self.assertEqual(ready["reddit"]["mode"], "global_search")


class TestWebAppRedditCollection(unittest.TestCase):
    """Verify web collection worker integrates with subreddit collection, deduplication, and DB storage."""

    @patch("app.web.collect_from_source")
    def test_run_collection_persists_subreddit_lead_and_deduplicates(
        self, mock_collect: MagicMock
    ) -> None:
        import json
        import sqlite3
        import tempfile
        from pathlib import Path
        from app.web import _init_db, _run_collection

        post = {
            "raw_text": "2BHK apartment in Satellite for rent, 24000/month.",
            "source_url": "https://www.reddit.com/r/ahmedabad/comments/xyz123/2bhk/",
            "author": "landlord_sam",
            "posted_at": 1712000000.0,
            "source_post_id": "xyz123",
            "subreddit": "ahmedabad",
            "collection_mode": "subreddit",
        }
        mock_collect.return_value = [post]

        with tempfile.TemporaryDirectory() as tmpdir:
            db_file = Path(tmpdir) / "test_review.sqlite3"
            with patch("app.web.DB_PATH", db_file):
                _init_db()
                with sqlite3.connect(db_file) as conn:
                    conn.execute(
                        "INSERT INTO collection_runs (run_id, status, sources, cities, started_at) VALUES (?, ?, ?, ?, ?)",
                        ("run_1", "queued", '["reddit"]', '["Ahmedabad"]', "2026-10-16T12:00:00Z"),
                    )

                _run_collection("run_1", ["reddit"], ["Ahmedabad"])

                with sqlite3.connect(db_file) as conn:
                    conn.row_factory = sqlite3.Row
                    run = conn.execute("SELECT * FROM collection_runs WHERE run_id='run_1'").fetchone()
                    self.assertEqual(run["status"], "completed")
                    self.assertEqual(run["found_count"], 1)

                    leads = conn.execute("SELECT * FROM review_leads").fetchall()
                    self.assertEqual(len(leads), 1)
                    lead_data = json.loads(leads[0]["data"])
                    self.assertEqual(lead_data["source"], "reddit")
                    self.assertEqual(lead_data["source_post_id"], "xyz123")
                    self.assertEqual(lead_data["subreddit"], "ahmedabad")
                    self.assertEqual(lead_data["collection_mode"], "subreddit")
                    self.assertEqual(lead_data["author"], "landlord_sam")
                    self.assertEqual(lead_data["raw_text"], "2BHK apartment in Satellite for rent, 24000/month.")
                    self.assertEqual(lead_data["source_url"], "https://www.reddit.com/r/ahmedabad/comments/xyz123/2bhk/")

                # Run a second collection with identical post to verify deduplication
                with sqlite3.connect(db_file) as conn:
                    conn.execute(
                        "INSERT INTO collection_runs (run_id, status, sources, cities, started_at) VALUES (?, ?, ?, ?, ?)",
                        ("run_2", "queued", '["reddit"]', '["Ahmedabad"]', "2026-10-16T12:05:00Z"),
                    )
                _run_collection("run_2", ["reddit"], ["Ahmedabad"])

                with sqlite3.connect(db_file) as conn:
                    conn.row_factory = sqlite3.Row
                    run2 = conn.execute("SELECT * FROM collection_runs WHERE run_id='run_2'").fetchone()
                    self.assertEqual(run2["status"], "completed")
                    self.assertEqual(run2["found_count"], 0)
                    total_leads = conn.execute("SELECT COUNT(*) FROM review_leads").fetchone()[0]
                    self.assertEqual(total_leads, 1)


if __name__ == "__main__":
    unittest.main()
