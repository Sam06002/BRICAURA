"""Authorize the Telegram user session used by BRICAURA's group collector."""

import os

from config.settings import get_settings


def main() -> int:
    get_settings()
    api_id, api_hash = os.getenv("TELEGRAM_API_ID"), os.getenv("TELEGRAM_API_HASH")
    if not api_id or not api_hash:
        raise SystemExit("Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env first.")
    try:
        from telethon.sync import TelegramClient
    except ImportError as exc:
        raise SystemExit("Install project requirements first: pip install -r requirements.txt") from exc
    session = os.getenv("TELEGRAM_SESSION", "credentials/bricaura_telegram")
    client = TelegramClient(session, int(api_id), api_hash)
    try:
        client.start()
        print("Telegram session authorized. Keep the generated session file private.")
    finally:
        client.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
