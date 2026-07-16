"""
Production Configuration — Environment-based settings for TeleMon.

All production settings are read from environment variables with sensible defaults.
This centralizes configuration so individual modules don't need to call os.environ.

v1 — Production configuration management.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any


@dataclass
class DatabaseConfig:
    """SQLite database configuration."""
    db_path: str = field(default_factory=lambda: os.environ.get("DB_PATH", "data/runtime.db"))
    admin_db_path: str = field(default_factory=lambda: os.environ.get("ADMIN_DB_PATH", "data/admin.db"))
    pool_timeout: int = int(os.environ.get("DB_POOL_TIMEOUT", "30"))
    wal_mode: bool = os.environ.get("DB_WAL_MODE", "true").lower() == "true"
    backup_enabled: bool = os.environ.get("DB_BACKUP_ENABLED", "true").lower() == "true"
    backup_interval_minutes: int = int(os.environ.get("DB_BACKUP_INTERVAL_MINUTES", "60"))
    backup_dir: str = os.environ.get("DB_BACKUP_DIR", "data/backups")


@dataclass
class ServerConfig:
    """FastAPI/uvicorn server configuration."""
    host: str = os.environ.get("HOST", "0.0.0.0")
    port: int = int(os.environ.get("PORT", "8000"))
    workers: int = int(os.environ.get("WORKERS", "1"))
    log_level: str = os.environ.get("LOG_LEVEL", "info")
    reload: bool = os.environ.get("RELOAD", "false").lower() == "true"
    cors_origins: list[str] = field(default_factory=lambda: [
        o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    ])
    request_timeout: int = int(os.environ.get("REQUEST_TIMEOUT", "60"))
    max_request_size: int = int(os.environ.get("MAX_REQUEST_SIZE", "10485760"))  # 10MB


@dataclass
class AuthConfig:
    """Authentication and token configuration."""
    token_expiry_hours: int = int(os.environ.get("TOKEN_EXPIRY_HOURS", "24"))
    token_cleanup_interval_minutes: int = int(os.environ.get("TOKEN_CLEANUP_INTERVAL_MINUTES", "60"))
    max_failed_logins: int = int(os.environ.get("MAX_FAILED_LOGINS", "5"))
    login_lockout_minutes: int = int(os.environ.get("LOGIN_LOCKOUT_MINUTES", "15"))
    password_min_length: int = int(os.environ.get("PASSWORD_MIN_LENGTH", "8"))


@dataclass
class MonitoringConfig:
    """Monitoring and alerting configuration."""
    metrics_enabled: bool = os.environ.get("METRICS_ENABLED", "true").lower() == "true"
    structured_logging: bool = os.environ.get("STRUCTURED_LOGGING", "true").lower() == "true"
    alert_webhook_url: str = os.environ.get("ALERT_WEBHOOK_URL", "")
    alert_level: str = os.environ.get("ALERT_LEVEL", "ERROR").upper()
    health_check_interval: int = int(os.environ.get("HEALTH_CHECK_INTERVAL", "30"))


@dataclass
class RuntimeConfig:
    """Account runtime configuration."""
    sessions_dir: str = os.environ.get("SESSIONS_DIR", "sessions")
    startup_delay: float = float(os.environ.get("STARTUP_DELAY", "0.5"))
    max_accounts_per_user: int = int(os.environ.get("MAX_ACCOUNTS_PER_USER", "100"))
    healing_interval: int = int(os.environ.get("HEALING_INTERVAL", "300"))  # 5 minutes
    group_cache_ttl: int = int(os.environ.get("GROUP_CACHE_TTL", "300"))  # 5 minutes


@dataclass
class RateLimitConfig:
    """Rate limiting configuration."""
    global_rate_limit: int = int(os.environ.get("GLOBAL_RATE_LIMIT", "100"))  # requests per minute
    ip_rate_limit: int = int(os.environ.get("IP_RATE_LIMIT", "60"))  # requests per minute per IP
    burst_size: int = int(os.environ.get("BURST_SIZE", "20"))


@dataclass
class ProductionConfig:
    """Aggregate all configuration sections."""
    db: DatabaseConfig = field(default_factory=DatabaseConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    auth: AuthConfig = field(default_factory=AuthConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    runtime: RuntimeConfig = field(default_factory=RuntimeConfig)
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    environment: str = os.environ.get("ENVIRONMENT", "production")
    app_name: str = "telemon"
    app_version: str = "1.0.0"
    debug: bool = os.environ.get("DEBUG", "false").lower() == "true"

    def is_production(self) -> bool:
        return self.environment == "production"

    def is_development(self) -> bool:
        return self.environment == "development"


# Singleton
_config: ProductionConfig | None = None


def get_config() -> ProductionConfig:
    """Get the production configuration singleton."""
    global _config
    if _config is None:
        _config = ProductionConfig()
    return _config


def reload_config() -> ProductionConfig:
    """Force reload configuration from environment variables."""
    global _config
    _config = ProductionConfig()
    return _config