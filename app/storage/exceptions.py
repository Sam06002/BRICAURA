"""Custom exceptions for the storage layer."""


class StorageError(Exception):
    """Base exception for all storage-related errors."""

    pass


class StorageConfigError(StorageError):
    """Raised when storage configuration is missing or invalid."""

    pass


class StorageAuthenticationError(StorageError):
    """Raised when authentication with the storage backend fails."""

    pass


class StorageInitializationError(StorageError):
    """Raised when initializing the storage container or worksheet fails."""

    pass


class StorageWriteError(StorageError):
    """Raised when saving or writing a record fails."""

    pass
