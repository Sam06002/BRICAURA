"""Facebook collection configuration, kept separate from storage and Google Sheets credentials."""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class FacebookCollectorConfig:
    """Configuration specific to Facebook lead collection.

    Maintains separation from Google Sheets storage credentials and backend authentication.
    """

    fixture_path: str | None = None
    group_ids: tuple[str, ...] = ()
    page_ids: tuple[str, ...] = ()
    meta_access_token: str | None = None
    meta_graph_api_version: str = "v26.0"


def _parse_csv_tuple(val: str | None) -> tuple[str, ...]:
    if not val:
        return ()
    return tuple(part.strip() for part in val.split(",") if part.strip())


def get_facebook_config() -> FacebookCollectorConfig:
    """Build FacebookCollectorConfig from environment variables."""
    default_fixture = str(Path("data/fixtures/facebook_property_posts.json"))
    fixture_path = os.getenv("FACEBOOK_FIXTURE_PATH", default_fixture)

    return FacebookCollectorConfig(
        fixture_path=fixture_path,
        group_ids=_parse_csv_tuple(os.getenv("FACEBOOK_GROUP_IDS")),
        page_ids=_parse_csv_tuple(os.getenv("FACEBOOK_PAGE_IDS")),
        meta_access_token=os.getenv("META_ACCESS_TOKEN"),
        meta_graph_api_version=os.getenv("META_GRAPH_API_VERSION", "v26.0"),
    )
