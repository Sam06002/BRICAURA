"""Authorized source adapters used by the local lead collection web app."""

from __future__ import annotations

import asyncio
import base64
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


class SourceUnavailable(RuntimeError):
    """Raised when a source cannot be used with the current API configuration."""


PROPERTY_TERMS = (
    "property", "flat", "apartment", "house", "villa", "plot", "land", "bhk", "bedroom",
    "rent", "rental", "lease", "tenant", "sale", "selling", "buy", "purchase", "broker",
    "owner", "room", "accommodation", "available", "looking for", "ભાડે", "વેચાણ", "ફ્લેટ",
    "મકાન", "ઘર", "રૂમ", "किराया", "बिक्री", "फ्लैट", "मकान", "कमरा",
)


def _city_terms(city: str) -> tuple[str, ...]:
    return ("ahmedabad", "amdavad", "અમદાવાદ") if city == "Ahmedabad" else (
        "gandhinagar", "gift city", "ગાંધીનગર"
    )


def is_relevant_post(text: str, city: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in _city_terms(city)) and any(
        term in lowered for term in PROPERTY_TERMS
    )


def _http_json(url: str, *, headers: dict[str, str], data: bytes | None = None) -> dict[str, Any]:
    request = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            import json

            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")[:400]
        raise SourceUnavailable(f"Source API returned HTTP {exc.code}: {details}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise SourceUnavailable(f"Could not reach source API: {exc}") from exc


def _search_queries(city: str) -> list[str]:
    place = '"Ahmedabad" OR "Amdavad"' if city == "Ahmedabad" else '"Gandhinagar" OR "GIFT City"'
    return [
        f'{place} (flat OR apartment OR house OR property) (rent OR sale OR buy OR available)',
        f'{place} (2BHK OR 3BHK OR broker OR owner OR furnished)',
    ]


def _reddit_access_token() -> str:
    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    user_agent = os.getenv("REDDIT_USER_AGENT", "BRICAURA/0.1 local lead review tool")
    if not client_id or not client_secret:
        raise SourceUnavailable("Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to enable Reddit search.")
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    token = _http_json(
        "https://www.reddit.com/api/v1/access_token",
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": user_agent,
        },
        data=urllib.parse.urlencode({"grant_type": "client_credentials"}).encode(),
    ).get("access_token")
    if not token:
        raise SourceUnavailable("Reddit did not return an access token. Check the configured app credentials.")
    return str(token)


def collect_reddit(city: str) -> list[dict[str, Any]]:
    """Search Reddit through OAuth using the application's configured credentials."""
    user_agent = os.getenv("REDDIT_USER_AGENT", "BRICAURA/0.1 local lead review tool")
    token = _reddit_access_token()

    found: dict[str, dict[str, Any]] = {}
    for query in _search_queries(city):
        params = urllib.parse.urlencode({"q": query, "sort": "new", "t": "month", "limit": 100})
        payload = _http_json(
            f"https://oauth.reddit.com/search?{params}",
            headers={"Authorization": f"Bearer {token}", "User-Agent": user_agent},
        )
        for child in payload.get("data", {}).get("children", []):
            post = child.get("data", {})
            key = str(post.get("id", ""))
            title, body = str(post.get("title", "")), str(post.get("selftext", ""))
            if key and is_relevant_post(f"{title} {body}", city):
                found[key] = {
                    "raw_text": "\n\n".join(part for part in (title, body) if part),
                    "source_url": "https://www.reddit.com" + str(post.get("permalink", "")),
                    "author": post.get("author"),
                    "posted_at": post.get("created_utc"),
                    "source_post_id": key,
                }
    return list(found.values())


def collect_telegram(city: str) -> list[dict[str, Any]]:
    """Search recent history in Telegram groups the signed-in account can access."""
    api_id, api_hash = os.getenv("TELEGRAM_API_ID"), os.getenv("TELEGRAM_API_HASH")
    groups = [item.strip() for item in os.getenv("TELEGRAM_GROUPS", "").split(",") if item.strip()]
    session = os.getenv("TELEGRAM_SESSION", "credentials/bricaura_telegram")
    if not api_id or not api_hash or not groups:
        raise SourceUnavailable(
            "Set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_GROUPS (comma-separated group usernames/IDs). "
            "Authorize the session once with `python -m app.telegram_login`."
        )
    try:
        from telethon import TelegramClient
    except ImportError as exc:
        raise SourceUnavailable("Telegram support requires Telethon. Install requirements.txt.") from exc

    Path(session).parent.mkdir(parents=True, exist_ok=True)
    try:
        return asyncio.run(_collect_telegram_history(int(api_id), api_hash, session, groups, city, TelegramClient))
    except SourceUnavailable:
        raise
    except Exception as exc:
        raise SourceUnavailable(f"Telegram collection failed: {exc}") from exc


async def _collect_telegram_history(
    api_id: int, api_hash: str, session: str, groups: list[str], city: str, client_type: Any
) -> list[dict[str, Any]]:
    client = client_type(session, api_id, api_hash)
    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise SourceUnavailable("Telegram session is not authorized. Run `python -m app.telegram_login` first.")
        rows: dict[str, dict[str, Any]] = {}
        needles = [city.lower(), "amdavad"] if city == "Ahmedabad" else ["gandhinagar", "gift city"]
        for group in groups:
            entity = await client.get_entity(group)
            async for message in client.iter_messages(entity, limit=500):
                body = message.message or ""
                if body and any(term in body.lower() for term in needles):
                    group_name = getattr(entity, "username", None)
                    rows[f"{entity.id}:{message.id}"] = {
                        "raw_text": body,
                        "source_url": f"https://t.me/{group_name}/{message.id}" if group_name else None,
                        "author": str(message.sender_id) if message.sender_id else None,
                        "posted_at": message.date.timestamp() if message.date else None,
                        "source_post_id": f"{entity.id}:{message.id}",
                    }
        return list(rows.values())
    finally:
        await client.disconnect()


def collect_facebook(_city: str) -> list[dict[str, Any]]:
    """Read recent posts from explicitly configured Facebook Pages via Meta Graph API."""
    token = os.getenv("META_ACCESS_TOKEN")
    page_ids = [item.strip() for item in os.getenv("FACEBOOK_PAGE_IDS", "").split(",") if item.strip()]
    if not token or not page_ids:
        raise SourceUnavailable(
            "Facebook Groups API was removed by Meta. For Page feeds, set META_ACCESS_TOKEN and "
            "FACEBOOK_PAGE_IDS with a token authorized to read those Pages."
        )
    version = os.getenv("META_GRAPH_API_VERSION", "v26.0")
    posts: dict[str, dict[str, Any]] = {}
    for page_id in page_ids:
        params = urllib.parse.urlencode({"fields": "id,message,permalink_url,created_time,from", "limit": 100})
        payload = _http_json(
            f"https://graph.facebook.com/{version}/{urllib.parse.quote(page_id, safe='')}/feed?{params}",
            headers={"Authorization": f"Bearer {token}"},
        )
        for post in payload.get("data", []):
            message = str(post.get("message", ""))
            post_id = str(post.get("id", ""))
            if post_id and message:
                posts[post_id] = {
                    "raw_text": message,
                    "source_url": post.get("permalink_url"),
                    "author": (post.get("from") or {}).get("name"),
                    "posted_at": post.get("created_time"),
                    "source_post_id": post_id,
                }
    # The collection worker applies the selected city and property relevance filter.
    return list(posts.values())


def check_connection(source: str) -> str:
    """Perform a lightweight authenticated request for one configured source."""
    if source == "reddit":
        token = _reddit_access_token()
        user_agent = os.getenv("REDDIT_USER_AGENT", "BRICAURA/0.1 local lead review tool")
        query = urllib.parse.urlencode({"q": "Ahmedabad", "sort": "new", "limit": 1})
        _http_json(
            f"https://oauth.reddit.com/search?{query}",
            headers={"Authorization": f"Bearer {token}", "User-Agent": user_agent},
        )
        return "Reddit OAuth and read access succeeded."
    if source == "facebook":
        rows = collect_facebook("Ahmedabad")
        return f"Meta Graph API access succeeded; fetched {len(rows)} recent Page post(s)."
    if source == "telegram":
        return asyncio.run(_check_telegram_session())
    raise SourceUnavailable(f"Unknown source: {source}")


async def _check_telegram_session() -> str:
    api_id, api_hash = os.getenv("TELEGRAM_API_ID"), os.getenv("TELEGRAM_API_HASH")
    groups = [item.strip() for item in os.getenv("TELEGRAM_GROUPS", "").split(",") if item.strip()]
    session = os.getenv("TELEGRAM_SESSION", "credentials/bricaura_telegram")
    if not api_id or not api_hash or not groups:
        raise SourceUnavailable(
            "Set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_GROUPS, then authorize with `python -m app.telegram_login`."
        )
    try:
        from telethon import TelegramClient
    except ImportError as exc:
        raise SourceUnavailable("Telegram support requires Telethon. Install requirements.txt.") from exc
    Path(session).parent.mkdir(parents=True, exist_ok=True)
    client: Any = TelegramClient(session, int(api_id), api_hash)
    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise SourceUnavailable("Telegram session is not authorized. Run `python -m app.telegram_login` first.")
        found = []
        for group in groups:
            entity = await client.get_entity(group)
            found.append(getattr(entity, "title", None) or group)
        return f"Telegram session is authorized; accessible groups: {', '.join(found)}."
    finally:
        await client.disconnect()


def source_readiness() -> dict[str, dict[str, Any]]:
    reddit_ready = bool(os.getenv("REDDIT_CLIENT_ID") and os.getenv("REDDIT_CLIENT_SECRET"))
    telegram_ready = bool(os.getenv("TELEGRAM_API_ID") and os.getenv("TELEGRAM_API_HASH") and os.getenv("TELEGRAM_GROUPS"))
    facebook_ready = bool(os.getenv("META_ACCESS_TOKEN") and os.getenv("FACEBOOK_PAGE_IDS"))
    return {
        "reddit": {"ready": reddit_ready, "message": "Ready" if reddit_ready else "Add Reddit API credentials in .env"},
        "facebook": {
            "ready": facebook_ready,
            "message": "Facebook Pages configured; Groups API is unavailable" if facebook_ready else "Groups API was removed; Pages need an authorized token and Page IDs",
        },
        "telegram": {
            "ready": telegram_ready,
            "message": "Ready" if telegram_ready else "Add Telegram API settings and group list in .env",
        },
    }


def collect_from_source(source: str, city: str) -> list[dict[str, Any]]:
    adapters = {"reddit": collect_reddit, "facebook": collect_facebook, "telegram": collect_telegram}
    if source not in adapters:
        raise SourceUnavailable(f"Unknown source: {source}")
    return adapters[source](city)
