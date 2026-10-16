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


def is_relevant_post(text: str, city: str, context: str = "") -> bool:
    lowered = text.lower()
    combined = f"{context} {text}".lower() if context else lowered
    return any(term in combined for term in _city_terms(city)) and any(
        term in lowered for term in PROPERTY_TERMS
    )


def parse_subreddits(val: str | None) -> list[str]:
    """Parse comma-separated subreddit names, stripping optional 'r/' or '/r/' prefixes."""
    if not val:
        return []
    result: list[str] = []
    seen: set[str] = set()
    for item in val.split(","):
        cleaned = item.strip()
        if not cleaned:
            continue
        if cleaned.lower().startswith("/r/"):
            cleaned = cleaned[3:]
        elif cleaned.lower().startswith("r/"):
            cleaned = cleaned[2:]
        cleaned = cleaned.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)
    return result


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


def collect_reddit(city: str, errors: list[dict[str, str]] | None = None) -> list[dict[str, Any]]:
    """Search Reddit through OAuth using configured subreddits or global search fallback."""
    user_agent = os.getenv("REDDIT_USER_AGENT", "BRICAURA/0.1 local lead review tool")
    token = _reddit_access_token()
    headers = {"Authorization": f"Bearer {token}", "User-Agent": user_agent}

    found: dict[str, dict[str, Any]] = {}
    subreddits = parse_subreddits(os.getenv("REDDIT_SUBREDDITS"))

    if subreddits:
        collection_mode = "subreddit"
        sub_errors: list[str] = []
        for sub in subreddits:
            try:
                params = urllib.parse.urlencode({"limit": 100})
                url = f"https://oauth.reddit.com/r/{urllib.parse.quote(sub)}/new?{params}"
                payload = _http_json(url, headers=headers)
                for child in payload.get("data", {}).get("children", []):
                    post = child.get("data", {})
                    key = str(post.get("id", "")).strip()
                    if not key or key in found:
                        continue
                    title = str(post.get("title", "")).strip()
                    body = str(post.get("selftext", "")).strip()
                    raw_text = "\n\n".join(part for part in (title, body) if part)
                    sub_name = str(post.get("subreddit", "")).strip() or sub
                    if not raw_text or not is_relevant_post(raw_text, city, context=sub_name):
                        continue
                    author = post.get("author")
                    if author in (None, "", "[deleted]", "[removed]"):
                        author = None
                    permalink = post.get("permalink")
                    source_url = f"https://www.reddit.com{permalink}" if permalink else None
                    found[key] = {
                        "raw_text": raw_text,
                        "source_url": source_url,
                        "author": author,
                        "posted_at": post.get("created_utc"),
                        "source_post_id": key,
                        "subreddit": sub_name,
                        "collection_mode": collection_mode,
                    }
            except Exception as exc:
                err_msg = f"Failed to collect from subreddit 'r/{sub}': {exc}"
                sub_errors.append(err_msg)
                if errors is not None:
                    errors.append({"source": "reddit", "city": city, "message": err_msg})
        if not found and sub_errors and errors is None:
            raise SourceUnavailable("; ".join(sub_errors))
    else:
        collection_mode = "global_search"
        for query in _search_queries(city):
            params = urllib.parse.urlencode({"q": query, "sort": "new", "t": "month", "limit": 100})
            payload = _http_json(
                f"https://oauth.reddit.com/search?{params}",
                headers=headers,
            )
            for child in payload.get("data", {}).get("children", []):
                post = child.get("data", {})
                key = str(post.get("id", "")).strip()
                if not key or key in found:
                    continue
                title = str(post.get("title", "")).strip()
                body = str(post.get("selftext", "")).strip()
                raw_text = "\n\n".join(part for part in (title, body) if part)
                sub_name = str(post.get("subreddit", "")).strip()
                if not raw_text or not is_relevant_post(raw_text, city, context=sub_name):
                    continue
                author = post.get("author")
                if author in (None, "", "[deleted]", "[removed]"):
                    author = None
                permalink = post.get("permalink")
                source_url = f"https://www.reddit.com{permalink}" if permalink else None
                found[key] = {
                    "raw_text": raw_text,
                    "source_url": source_url,
                    "author": author,
                    "posted_at": post.get("created_utc"),
                    "source_post_id": key,
                    "subreddit": sub_name,
                    "collection_mode": collection_mode,
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
        subreddits = parse_subreddits(os.getenv("REDDIT_SUBREDDITS"))
        if subreddits:
            sub = subreddits[0]
            _http_json(
                f"https://oauth.reddit.com/r/{urllib.parse.quote(sub)}/new?limit=1",
                headers={"Authorization": f"Bearer {token}", "User-Agent": user_agent},
            )
            sub_list = ", ".join(f"r/{s}" for s in subreddits)
            return f"Reddit OAuth access succeeded (mode: subreddits [{sub_list}])."
        query = urllib.parse.urlencode({"q": "Ahmedabad", "sort": "new", "limit": 1})
        _http_json(
            f"https://oauth.reddit.com/search?{query}",
            headers={"Authorization": f"Bearer {token}", "User-Agent": user_agent},
        )
        return "Reddit OAuth access succeeded (mode: global_search fallback)."
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

    if reddit_ready:
        subs = parse_subreddits(os.getenv("REDDIT_SUBREDDITS"))
        if subs:
            reddit_msg = f"Ready (monitoring: {', '.join(f'r/{s}' for s in subs)})"
            reddit_mode = "subreddit"
        else:
            reddit_msg = "Ready (mode: global_search fallback)"
            reddit_mode = "global_search"
    else:
        reddit_msg = "Add Reddit API credentials in .env"
        reddit_mode = "unconfigured"

    return {
        "reddit": {
            "ready": reddit_ready,
            "message": reddit_msg,
            "mode": reddit_mode,
        },
        "facebook": {
            "ready": facebook_ready,
            "message": "Facebook Pages configured; Groups API is unavailable" if facebook_ready else "Groups API was removed; Pages need an authorized token and Page IDs",
        },
        "telegram": {
            "ready": telegram_ready,
            "message": "Ready" if telegram_ready else "Add Telegram API settings and group list in .env",
        },
    }


def collect_from_source(source: str, city: str, errors: list[dict[str, str]] | None = None) -> list[dict[str, Any]]:
    if source == "reddit":
        return collect_reddit(city, errors=errors)
    if source == "facebook":
        return collect_facebook(city)
    if source == "telegram":
        return collect_telegram(city)
    raise SourceUnavailable(f"Unknown source: {source}")
