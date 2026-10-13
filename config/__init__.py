"""Configuration package for the lead management system."""

from config.facebook import FacebookCollectorConfig, get_facebook_config
from config.settings import Settings, get_settings

__all__ = [
    "FacebookCollectorConfig",
    "Settings",
    "get_facebook_config",
    "get_settings",
]
