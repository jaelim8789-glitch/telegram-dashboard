"""
Media utilities — MIME type ↔ extension mapping for Telegram file handling.

Telegram Bot API and Telethon may return files with various MIME types
(image/webp for stickers, video/mp4 for animations, etc.). This module
provides canonical mappings and helper functions so the rest of the
backend doesn't need to hardcode these lookups.

Usage:
    from backend.media import get_extension, is_supported

    ext = get_extension("image/webp")          # → ".webp"
    ok  = is_supported("video/x-matroska")     # → True
"""

from __future__ import annotations

from typing import Final

# ── Content-Type → Extension ─────────────────────────────────────────
# Canonical mapping: Telegram API content-type → file extension.
# Add missing types here when Telegram introduces new file formats.

_EXTENSION_BY_CONTENT_TYPE: Final[dict[str, str]] = {
    # Images
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    # Videos
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/x-matroska": ".mkv",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/mpeg": ".mpeg",
    "video/3gpp": ".3gp",
    # Audio
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/flac": ".flac",
    "audio/aac": ".aac",
    "audio/mp4": ".m4a",
    "audio/webm": ".weba",
    # Documents
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "application/json": ".json",
    "application/zip": ".zip",
}

# ── Extension → Content-Type (reverse) ───────────────────────────────

_CONTENT_TYPE_BY_EXTENSION: Final[dict[str, str]] = {
    v: k for k, v in _EXTENSION_BY_CONTENT_TYPE.items()
}


# ── Categorisation ───────────────────────────────────────────────────

_IMAGE_TYPES: Final[frozenset[str]] = frozenset({
    k for k in _EXTENSION_BY_CONTENT_TYPE if k.startswith("image/")
})

_VIDEO_TYPES: Final[frozenset[str]] = frozenset({
    k for k in _EXTENSION_BY_CONTENT_TYPE if k.startswith("video/")
})

_AUDIO_TYPES: Final[frozenset[str]] = frozenset({
    k for k in _EXTENSION_BY_CONTENT_TYPE if k.startswith("audio/")
})


# ── Public helpers ───────────────────────────────────────────────────


def get_extension(content_type: str) -> str | None:
    """Return the canonical file extension for *content_type*, or None."""
    return _EXTENSION_BY_CONTENT_TYPE.get(content_type.lower())


def get_content_type(extension: str) -> str | None:
    """Return the MIME type for *extension* (e.g. '.jpg'), or None."""
    return _CONTENT_TYPE_BY_EXTENSION.get(extension.lower())


def is_image(content_type: str) -> bool:
    """Return True if *content_type* represents an image."""
    return content_type.lower() in _IMAGE_TYPES


def is_video(content_type: str) -> bool:
    """Return True if *content_type* represents a video."""
    return content_type.lower() in _VIDEO_TYPES


def is_audio(content_type: str) -> bool:
    """Return True if *content_type* represents an audio file."""
    return content_type.lower() in _AUDIO_TYPES


def is_supported(content_type: str) -> bool:
    """Return True if *content_type* is in the known mapping."""
    return content_type.lower() in _EXTENSION_BY_CONTENT_TYPE


def safe_filename(original_name: str | None, content_type: str | None) -> str:
    """Generate a safe filename from an original name and/or content type.

    If *original_name* already has an extension it's returned as-is.
    Otherwise the extension is derived from *content_type*.
    Falls back to ``file.bin`` when nothing can be determined.
    """
    if original_name and "." in original_name:
        return original_name  # already has an extension
    ext = get_extension(content_type or "") if content_type else None
    if ext:
        base = (original_name or "file").rsplit(".", 1)[0]
        return f"{base}{ext}"
    return original_name or "file.bin"
