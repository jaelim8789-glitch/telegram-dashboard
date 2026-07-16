"""
AdminPlatform — Enterprise급 TeleMon 운영 관리 시스템.

10대 핵심 모듈:
1. RBAC          — Role-Based Access Control (admin/user/api_key)
2. Permissions   — Middleware-compatible permission checker
3. Plan Engine   — Plan 정의 (free/premium/enterprise) + feature mapping
4. Feature Flag  — Per-plan feature gating
5. Usage Limit   — Per-account/per-plan usage tracking & limits
6. API Key Manager — API key 생성/검증/순환/폐기
7. Trial Manager — Trial 기간 관리 + 만료 처리
8. Admin Dashboard — 시스템 통계, 사용자 관리
9. Audit Log     — 모든 관리 작업 기록
10. Billing Ready — Stripe-ready billing models & hooks

원칙:
- 기존 Runtime 아키텍처 절대 깨지 않음
- 모든 변경은 테스트 통과 후 통합
- Production 안정성 최우선
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import secrets
import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)

DB_PATH = os.environ.get("ADMIN_DB_PATH", "data/admin.db")


# ── Enums ────────────────────────────────────────────────────────────

class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"
    API_KEY = "api_key"
    READ_ONLY = "read_only"


class Plan(str, Enum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"
    LIFETIME = "lifetime"


class Feature(str, Enum):
    # Account management
    MAX_ACCOUNTS = "max_accounts"
    MAX_GROUPS = "max_groups"
    
    # Messaging
    BROADCAST = "broadcast"
    AUTO_REPLY = "auto_reply"
    REPLY_MACRO = "reply_macro"
    SCHEDULED_SEND = "scheduled_send"
    
    # Daily limits
    DAILY_SEND_LIMIT = "daily_send_limit"
    DAILY_AUTO_REPLY_LIMIT = "daily_auto_reply_limit"
    
    # Advanced
    API_ACCESS = "api_access"
    WEBHOOKS = "webhooks"
    CUSTOM_TEMPLATES = "custom_templates"
    ANALYTICS = "analytics"
    AUDIT_LOG = "audit_log"
    HEALING_ENGINE = "healing_engine"
    PRIORITY_SUPPORT = "priority_support"
    WHITE_LABEL = "white_label"
    
    # Enterprise
    TEAM_MEMBERS = "team_members"
    SSO = "sso"
    CUSTOM_RATE_LIMITS = "custom_rate_limits"
    DEDICATED_INFRA = "dedicated_infrastructure"


class AuditAction(str, Enum):
    # Account
    ACCOUNT_CREATED = "account.created"
    ACCOUNT_DELETED = "account.deleted"
    ACCOUNT_UPDATED = "account.updated"
    
    # Auth
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    API_KEY_CREATED = "api_key.created"
    API_KEY_REVOKED = "api_key.revoked"
    
    # Plan
    PLAN_CHANGED = "plan.changed"
    TRIAL_STARTED = "trial.started"
    TRIAL_EXPIRED = "trial.expired"
    
    # Billing
    SUBSCRIPTION_CREATED = "subscription.created"
    SUBSCRIPTION_CANCELLED = "subscription.cancelled"
    PAYMENT_SUCCEEDED = "payment.succeeded"
    PAYMENT_FAILED = "payment.failed"
    INVOICE_CREATED = "invoice.created"
    
    # Admin
    ADMIN_ACTION = "admin.action"
    SETTINGS_CHANGED = "settings.changed"
    FEATURE_TOGGLED = "feature.toggled"
    USER_SUSPENDED = "user.suspended"
    USER_ACTIVATED = "user.activated"
    
    # System
    SYSTEM_CONFIG_CHANGED = "system.config_changed"
    MAINTENANCE_MODE = "system.maintenance"


# ── Plan Definitions ─────────────────────────────────────────────────

@dataclass
class PlanDefinition:
    """Plan definition with feature limits."""
    name: str
    max_accounts: int
    max_groups_per_account: int
    daily_send_limit: int
    daily_auto_reply_limit: int
    max_team_members: int
    features: set[Feature]
    price_monthly_cents: int
    price_yearly_cents: int
    api_rate_limit: int  # requests per minute
    priority_support: bool = False
    audit_log_retention_days: int = 7
    daily_limit: int = 0  # overall daily API call limit (0 = unlimited)
    feature_flags: dict[str, bool] = field(default_factory=dict)


PLANS: dict[str, PlanDefinition] = {
    Plan.FREE: PlanDefinition(
        name="Free",
        max_accounts=1,
        max_groups_per_account=50,
        daily_send_limit=100,
        daily_auto_reply_limit=50,
        max_team_members=1,
        features={
            Feature.BROADCAST, Feature.AUTO_REPLY, Feature.REPLY_MACRO,
            Feature.API_ACCESS, Feature.ANALYTICS,
        },
        price_monthly_cents=0,
        price_yearly_cents=0,
        api_rate_limit=30,
        audit_log_retention_days=3,
        daily_limit=100,
        feature_flags={"can_export": False, "can_webhook": False},
    ),
    Plan.PRO: PlanDefinition(
        name="Pro",
        max_accounts=10,
        max_groups_per_account=500,
        daily_send_limit=5000,
        daily_auto_reply_limit=2500,
        max_team_members=5,
        features={
            Feature.BROADCAST, Feature.AUTO_REPLY, Feature.REPLY_MACRO,
            Feature.SCHEDULED_SEND, Feature.API_ACCESS, Feature.WEBHOOKS,
            Feature.CUSTOM_TEMPLATES, Feature.ANALYTICS, Feature.AUDIT_LOG,
            Feature.HEALING_ENGINE, Feature.PRIORITY_SUPPORT,
        },
        price_monthly_cents=9999,  # $99.99
        price_yearly_cents=99990,  # $999.90
        api_rate_limit=120,
        priority_support=True,
        audit_log_retention_days=30,
        daily_limit=1000,
        feature_flags={"can_export": True, "can_webhook": True, "bulk_operations": True},
    ),
    Plan.TEAM: PlanDefinition(
        name="Team",
        max_accounts=50,
        max_groups_per_account=2000,
        daily_send_limit=50000,
        daily_auto_reply_limit=25000,
        max_team_members=20,
        features={
            Feature.BROADCAST, Feature.AUTO_REPLY, Feature.REPLY_MACRO,
            Feature.SCHEDULED_SEND, Feature.API_ACCESS, Feature.WEBHOOKS,
            Feature.CUSTOM_TEMPLATES, Feature.ANALYTICS, Feature.AUDIT_LOG,
            Feature.HEALING_ENGINE, Feature.PRIORITY_SUPPORT,
            Feature.TEAM_MEMBERS,
        },
        price_monthly_cents=29999,  # $299.99
        price_yearly_cents=299990,  # $2,999.90
        api_rate_limit=300,
        priority_support=True,
        audit_log_retention_days=60,
        daily_limit=5000,
        feature_flags={"can_export": True, "can_webhook": True, "bulk_operations": True, "sso": False},
    ),
    Plan.LIFETIME: PlanDefinition(
        name="Lifetime",
        max_accounts=100,
        max_groups_per_account=5000,
        daily_send_limit=100000,
        daily_auto_reply_limit=50000,
        max_team_members=50,
        features={
            Feature.BROADCAST, Feature.AUTO_REPLY, Feature.REPLY_MACRO,
            Feature.SCHEDULED_SEND, Feature.API_ACCESS, Feature.WEBHOOKS,
            Feature.CUSTOM_TEMPLATES, Feature.ANALYTICS, Feature.AUDIT_LOG,
            Feature.HEALING_ENGINE, Feature.PRIORITY_SUPPORT,
            Feature.WHITE_LABEL, Feature.TEAM_MEMBERS, Feature.SSO,
            Feature.CUSTOM_RATE_LIMITS, Feature.DEDICATED_INFRA,
        },
        price_monthly_cents=199999,  # $1,999.99 one-time equivalent
        price_yearly_cents=0,
        api_rate_limit=1000,
        priority_support=True,
        audit_log_retention_days=365,
        daily_limit=0,
        feature_flags={"can_export": True, "can_webhook": True, "bulk_operations": True, "sso": True, "white_label": True},
    ),
}


# ── Backward compatibility: map old plan names to new ones ────────────

_PLAN_ALIASES: dict[str, str] = {
    "starter": "pro",
    "professional": "pro",
    "enterprise": "team",
    "premium": "pro",
}


def resolve_plan(plan_name: str | None) -> str:
    """Resolve any plan name (including legacy names) to a current Plan value."""
    if not plan_name:
        return Plan.FREE
    if plan_name in PLANS:
        return plan_name
    return _PLAN_ALIASES.get(plan_name.lower(), Plan.FREE)


# ── Admin Database ───────────────────────────────────────────────────

class AdminDB:
    """Admin platform database — users, api_keys, audit_logs, subscriptions."""

    def __init__(self, db_path: str = DB_PATH) -> None:
        self._db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
        os.makedirs(os.path.dirname(self._db_path) or ".", exist_ok=True)
        conn = sqlite3.connect(self._db_path, timeout=30)
        
        # Enable WAL mode for production concurrent access
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute("PRAGMA cache_size=-4000")  # 4MB cache
        
        # Users
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                plan TEXT NOT NULL DEFAULT 'free',
                is_active INTEGER DEFAULT 1,
                is_suspended INTEGER DEFAULT 0,
                trial_started_at TEXT,
                trial_ends_at TEXT,
                subscription_id TEXT,
                subscription_status TEXT DEFAULT 'inactive',
                stripe_customer_id TEXT,
                created_at TEXT DEFAULT '',
                updated_at TEXT DEFAULT '',
                last_login_at TEXT
            )
        """)
        
        # API Keys (enhanced: plan, feature_flags, limits, usage tracking)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                key_hash TEXT NOT NULL,
                key_prefix TEXT NOT NULL,
                name TEXT DEFAULT '',
                permissions TEXT DEFAULT 'read',
                plan TEXT DEFAULT 'free',
                feature_flags TEXT DEFAULT '{}',
                max_accounts INTEGER DEFAULT 0,
                daily_limit INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                last_used_at TEXT,
                expires_at TEXT,
                created_at TEXT DEFAULT '',
                usage_count INTEGER DEFAULT 0,
                usage_reset_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Audit Logs
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                user_id TEXT,
                username TEXT,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                details TEXT DEFAULT '{}',
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER DEFAULT 1
            )
        """)
        
        # Subscriptions
        conn.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                plan TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                current_period_start TEXT,
                current_period_end TEXT,
                cancel_at_period_end INTEGER DEFAULT 0,
                stripe_subscription_id TEXT,
                stripe_price_id TEXT,
                trial_start TEXT,
                trial_end TEXT,
                created_at TEXT DEFAULT '',
                updated_at TEXT DEFAULT '',
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Usage Records
        conn.execute("""
            CREATE TABLE IF NOT EXISTS usage_records (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                date TEXT NOT NULL,
                messages_sent INTEGER DEFAULT 0,
                auto_replies_sent INTEGER DEFAULT 0,
                broadcasts_created INTEGER DEFAULT 0,
                api_calls INTEGER DEFAULT 0,
                created_at TEXT DEFAULT '',
                UNIQUE(user_id, date)
            )
        """)
        
        # Feature Flags (per-user overrides)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS feature_overrides (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                feature TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT '',
                UNIQUE(user_id, feature)
            )
        """)
        
        # Invoices (billing ready)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                subscription_id TEXT,
                amount_cents INTEGER NOT NULL,
                currency TEXT DEFAULT 'usd',
                status TEXT DEFAULT 'pending',
                stripe_invoice_id TEXT,
                paid_at TEXT,
                due_date TEXT,
                created_at TEXT DEFAULT '',
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        conn.commit()
        conn.close()

        # Run migrations for schema updates
        self._run_migrations()

        logger.info("Admin database initialized at %s", self._db_path)

    def _run_migrations(self) -> None:
        """Run incremental schema migrations to preserve existing data."""
        conn = sqlite3.connect(self._db_path, timeout=30)
        try:
            cursor = conn.execute("PRAGMA table_info(api_keys)")
            columns = {row[1] for row in cursor.fetchall()}

            migrations = [
                ("plan", "ALTER TABLE api_keys ADD COLUMN plan TEXT DEFAULT 'free'"),
                ("feature_flags", "ALTER TABLE api_keys ADD COLUMN feature_flags TEXT DEFAULT '{}'"),
                ("max_accounts", "ALTER TABLE api_keys ADD COLUMN max_accounts INTEGER DEFAULT 0"),
                ("daily_limit", "ALTER TABLE api_keys ADD COLUMN daily_limit INTEGER DEFAULT 0"),
                ("usage_count", "ALTER TABLE api_keys ADD COLUMN usage_count INTEGER DEFAULT 0"),
                ("usage_reset_at", "ALTER TABLE api_keys ADD COLUMN usage_reset_at TEXT"),
            ]

            for col_name, alter_sql in migrations:
                if col_name not in columns:
                    try:
                        conn.execute(alter_sql)
                        logger.info("Migration: added column '%s' to api_keys", col_name)
                    except Exception as e:
                        logger.warning("Migration skipped for '%s': %s", col_name, e)

            conn.commit()
        finally:
            conn.close()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout=5000")
        return conn


# ── Singleton ────────────────────────────────────────────────────────

class AdminPlatform:
    """Enterprise Admin Platform — singleton, 모든 관리 기능 통합."""

    _instance: AdminPlatform | None = None

    @classmethod
    def get_instance(cls) -> AdminPlatform:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self) -> None:
        self.db = AdminDB()
        self._cache: dict[str, Any] = {}
        self._cache_ttl: float = 60.0  # 1 minute cache

    # ═════════════════════════════════════════════════════════════════
    # 1. RBAC
    # ═════════════════════════════════════════════════════════════════

    def create_user(
        self,
        username: str,
        password: str,
        role: str = "user",
        plan: str = "free",
        email: str | None = None,
        phone: str | None = None,
    ) -> dict[str, Any]:
        """Create a new admin user.

        The first registered user automatically gets super_admin role.
        """
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        password_hash = self._hash_password(password)

        # First user becomes super_admin automatically
        conn = self.db._get_conn()
        try:
            existing_count = conn.execute("SELECT COUNT(*) as cnt FROM users").fetchone()["cnt"]
            if existing_count == 0:
                role = Role.SUPER_ADMIN

            conn.execute(
                """INSERT INTO users
                   (id, username, password_hash, email, phone, role, plan,
                    is_active, is_suspended, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)""",
                (user_id, username, password_hash, email, phone, role, plan, now, now),
            )
            conn.commit()
            
            # If plan has trial, start trial
            if plan == Plan.FREE:
                self.start_trial(user_id)
            
            self._audit(user_id, username, AuditAction.ACCOUNT_CREATED,
                       "user", user_id, {"plan": plan, "role": role})
            
            return {"id": user_id, "username": username, "role": role, "plan": plan}
        except sqlite3.IntegrityError:
            raise ValueError(f"Username '{username}' already exists")
        finally:
            conn.close()

    def authenticate(self, username: str, password: str) -> dict[str, Any] | None:
        """Authenticate a user. Returns user data or None."""
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                "SELECT * FROM users WHERE username = ? AND is_active = 1 AND is_suspended = 0",
                (username,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            
            user = dict(row)
            if not self._verify_password(password, user["password_hash"]):
                return None
            
            # Update last login
            now = datetime.now(timezone.utc).isoformat()
            conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now, user["id"]))
            conn.commit()
            
            self._audit(user["id"], username, AuditAction.USER_LOGIN,
                       "user", user["id"], {})
            
            return user
        finally:
            conn.close()

    def get_user(self, user_id: str) -> dict[str, Any] | None:
        """Get user by ID."""
        conn = self.db._get_conn()
        try:
            cursor = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        conn = self.db._get_conn()
        try:
            cursor = conn.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def list_users(self, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        """List all users (admin dashboard)."""
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                "SELECT id, username, email, phone, role, plan, is_active, "
                "is_suspended, created_at, last_login_at, subscription_status "
                "FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            )
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    def update_user_role(self, user_id: str, new_role: str) -> dict[str, Any]:
        """Change user role (admin only)."""
        conn = self.db._get_conn()
        try:
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE users SET role = ?, updated_at = ? WHERE id = ?",
                (new_role, now, user_id),
            )
            conn.commit()
            
            user = self.get_user(user_id)
            self._audit("system", "system", AuditAction.ADMIN_ACTION,
                       "user", user_id, {"action": "role_change", "new_role": new_role})
            
            return user or {}
        finally:
            conn.close()

    def suspend_user(self, user_id: str) -> dict[str, Any]:
        """Suspend a user account."""
        conn = self.db._get_conn()
        try:
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE users SET is_suspended = 1, updated_at = ? WHERE id = ?",
                (now, user_id),
            )
            conn.commit()
            
            self._audit("system", "system", AuditAction.USER_SUSPENDED,
                       "user", user_id, {})
            
            return self.get_user(user_id) or {}
        finally:
            conn.close()

    def activate_user(self, user_id: str) -> dict[str, Any]:
        """Activate a suspended user."""
        conn = self.db._get_conn()
        try:
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE users SET is_suspended = 0, updated_at = ? WHERE id = ?",
                (now, user_id),
            )
            conn.commit()
            
            self._audit("system", "system", AuditAction.USER_ACTIVATED,
                       "user", user_id, {})
            
            return self.get_user(user_id) or {}
        finally:
            conn.close()

    def has_permission(self, user_id: str, required_role: str) -> bool:
        """Check if user has required role (RBAC)."""
        user = self.get_user(user_id)
        if not user:
            return False

        role_hierarchy = {
            Role.READ_ONLY: 0,
            Role.API_KEY: 0,
            Role.USER: 1,
            Role.ADMIN: 2,
            Role.SUPER_ADMIN: 3,
        }

        user_level = role_hierarchy.get(user.get("role", ""), 0)
        required_level = role_hierarchy.get(required_role, 0)

        return user_level >= required_level

    def validate_key_permissions(
        self, key_data: dict[str, Any], required_feature: str | None = None
    ) -> tuple[bool, str]:
        """Validate an API key's plan-level permissions.

        Returns (allowed, reason). Checks:
        - Key is active and not expired (already done in validate_api_key)
        - Plan has the required feature
        - Feature flags permit the action
        """
        plan_name = key_data.get("plan", Plan.FREE)
        plan_def = PLANS.get(resolve_plan(plan_name))
        if not plan_def:
            return False, f"Unknown plan: {plan_name}"

        if required_feature:
            feature_enum = next((f for f in Feature if f.value == required_feature), None)
            if feature_enum and feature_enum not in plan_def.features:
                return False, f"Plan '{plan_name}' does not include feature '{required_feature}'"

        return True, "ok"

    # ═════════════════════════════════════════════════════════════════
    # 2. Permissions (Middleware-compatible)
    # ═════════════════════════════════════════════════════════════════

    def require_role(self, user_id: str, role: str) -> bool:
        """Check if user has at least the given role."""
        return self.has_permission(user_id, role)

    def require_feature(self, user_id: str, feature: Feature) -> bool:
        """Check if user's plan has access to a feature."""
        user = self.get_user(user_id)
        if not user:
            return False

        plan_name = resolve_plan(user.get("plan", Plan.FREE))
        plan_def = PLANS.get(plan_name)
        if not plan_def:
            return False

        # Check feature overrides
        if self._has_feature_override(user_id, feature):
            return self._get_feature_override(user_id, feature)

        return feature in plan_def.features

    def check_usage_limit(
        self, user_id: str, feature: Feature, current_usage: int = 0
    ) -> tuple[bool, dict[str, Any]]:
        """Check if user has not exceeded their plan limit.

        Returns (allowed, limit_info).
        """
        user = self.get_user(user_id)
        if not user:
            return False, {"reason": "User not found"}

        plan_name = resolve_plan(user.get("plan", Plan.FREE))
        plan_def = PLANS.get(plan_name)
        if not plan_def:
            return False, {"reason": f"Unknown plan: {plan_name}"}
        
        limits = {
            Feature.MAX_ACCOUNTS: ("max_accounts", plan_def.max_accounts),
            Feature.DAILY_SEND_LIMIT: ("daily_send_limit", plan_def.daily_send_limit),
            Feature.DAILY_AUTO_REPLY_LIMIT: ("daily_auto_reply_limit", plan_def.daily_auto_reply_limit),
            Feature.TEAM_MEMBERS: ("team_members", plan_def.max_team_members),
        }
        
        if feature in limits:
            limit_name, limit_value = limits[feature]
            if current_usage >= limit_value:
                return False, {
                    "allowed": False,
                    "limit": limit_name,
                    "current": current_usage,
                    "max": limit_value,
                    "plan": plan_name,
                }
        
        return True, {
            "allowed": True,
            "plan": plan_name,
        }

    # ═════════════════════════════════════════════════════════════════
    # 3. Plan Engine
    # ═════════════════════════════════════════════════════════════════

    def get_plan(self, plan_name: str) -> PlanDefinition | None:
        """Get plan definition (supports legacy plan names)."""
        resolved = resolve_plan(plan_name)
        return PLANS.get(resolved)

    def list_plans(self) -> dict[str, Any]:
        """List all available plans with features."""
        return {
            name: {
                "name": p.name,
                "max_accounts": p.max_accounts,
                "max_groups_per_account": p.max_groups_per_account,
                "daily_send_limit": p.daily_send_limit,
                "daily_auto_reply_limit": p.daily_auto_reply_limit,
                "max_team_members": p.max_team_members,
                "features": sorted([f.value for f in p.features]),
                "price_monthly_cents": p.price_monthly_cents,
                "price_yearly_cents": p.price_yearly_cents,
                "api_rate_limit": p.api_rate_limit,
                "priority_support": p.priority_support,
                "audit_log_retention_days": p.audit_log_retention_days,
                "daily_limit": p.daily_limit,
                "feature_flags": p.feature_flags,
            }
            for name, p in PLANS.items()
        }

    def change_plan(self, user_id: str, new_plan: str) -> dict[str, Any]:
        """Change user's plan."""
        if new_plan not in PLANS:
            raise ValueError(f"Invalid plan: {new_plan}")
        
        conn = self.db._get_conn()
        try:
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE users SET plan = ?, updated_at = ? WHERE id = ?",
                (new_plan, now, user_id),
            )
            conn.commit()
            
            self._audit("system", "system", AuditAction.PLAN_CHANGED,
                       "user", user_id, {"new_plan": new_plan})
            
            return self.get_user(user_id) or {}
        finally:
            conn.close()

    # ═════════════════════════════════════════════════════════════════
    # 4. Feature Flag
    # ═════════════════════════════════════════════════════════════════

    def set_feature_override(self, user_id: str, feature: str, enabled: bool) -> None:
        """Override a feature flag for a specific user."""
        conn = self.db._get_conn()
        try:
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                """INSERT OR REPLACE INTO feature_overrides
                   (id, user_id, feature, enabled, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), user_id, feature, 1 if enabled else 0, now),
            )
            conn.commit()
            
            self._audit("system", "system", AuditAction.FEATURE_TOGGLED,
                       "feature", feature, {"user_id": user_id, "enabled": enabled})
        finally:
            conn.close()

    def _has_feature_override(self, user_id: str, feature: Feature) -> bool:
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                "SELECT 1 FROM feature_overrides WHERE user_id = ? AND feature = ?",
                (user_id, feature.value),
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()

    def _get_feature_override(self, user_id: str, feature: Feature) -> bool:
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                "SELECT enabled FROM feature_overrides WHERE user_id = ? AND feature = ?",
                (user_id, feature.value),
            )
            row = cursor.fetchone()
            return bool(row["enabled"]) if row else False
        finally:
            conn.close()

    # ═════════════════════════════════════════════════════════════════
    # 5. Usage Limit
    # ═════════════════════════════════════════════════════════════════

    def record_usage(
        self,
        user_id: str,
        messages_sent: int = 0,
        auto_replies_sent: int = 0,
        broadcasts_created: int = 0,
        api_calls: int = 0,
    ) -> None:
        """Record usage for a user for today."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        now = datetime.now(timezone.utc).isoformat()
        
        conn = self.db._get_conn()
        try:
            conn.execute(
                """INSERT INTO usage_records
                   (id, user_id, date, messages_sent, auto_replies_sent,
                    broadcasts_created, api_calls, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(user_id, date) DO UPDATE SET
                   messages_sent = messages_sent + ?,
                   auto_replies_sent = auto_replies_sent + ?,
                   broadcasts_created = broadcasts_created + ?,
                   api_calls = api_calls + ?""",
                (str(uuid.uuid4()), user_id, today,
                 messages_sent, auto_replies_sent, broadcasts_created, api_calls, now,
                 messages_sent, auto_replies_sent, broadcasts_created, api_calls),
            )
            conn.commit()
        finally:
            conn.close()

    def get_today_usage(self, user_id: str) -> dict[str, int]:
        """Get today's usage for a user."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                """SELECT messages_sent, auto_replies_sent, broadcasts_created, api_calls
                   FROM usage_records WHERE user_id = ? AND date = ?""",
                (user_id, today),
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
            return {"messages_sent": 0, "auto_replies_sent": 0,
                    "broadcasts_created": 0, "api_calls": 0}
        finally:
            conn.close()

    def get_usage_history(self, user_id: str, days: int = 30) -> list[dict[str, Any]]:
        """Get usage history for a user."""
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                """SELECT * FROM usage_records
                   WHERE user_id = ? ORDER BY date DESC LIMIT ?""",
                (user_id, days),
            )
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    # ═════════════════════════════════════════════════════════════════
    # 6. API Key Manager
    # ═════════════════════════════════════════════════════════════════

    def create_api_key(
        self,
        user_id: str,
        name: str = "",
        permissions: str = "read",
        expires_in_days: int | None = None,
        plan: str | None = None,
        feature_flags: dict[str, bool] | None = None,
        max_accounts: int | None = None,
        daily_limit: int | None = None,
    ) -> dict[str, Any]:
        """Create a new API key for a user.

        When plan is provided, the key inherits plan-level limits.
        Individual fields (max_accounts, daily_limit, feature_flags) can override plan defaults.
        """
        key_id = str(uuid.uuid4())
        raw_key = f"tm_{secrets.token_urlsafe(32)}"
        key_hash = self._hash_api_key(raw_key)
        key_prefix = raw_key[:12]

        now = datetime.now(timezone.utc).isoformat()
        expires_at = None
        if expires_in_days:
            expires_at = (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat()

        # Resolve plan and limits
        resolved_plan = plan or Plan.FREE
        plan_def = PLANS.get(resolved_plan)
        resolved_feature_flags = feature_flags or {}
        resolved_max_accounts = max_accounts if max_accounts is not None else (plan_def.max_accounts if plan_def else 0)
        resolved_daily_limit = daily_limit if daily_limit is not None else (plan_def.daily_limit if plan_def else 0)

        conn = self.db._get_conn()
        try:
            conn.execute(
                """INSERT INTO api_keys
                   (id, user_id, key_hash, key_prefix, name, permissions,
                    plan, feature_flags, max_accounts, daily_limit,
                    is_active, expires_at, created_at,
                    usage_count, usage_reset_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?)""",
                (key_id, user_id, key_hash, key_prefix, name, permissions,
                 resolved_plan, json.dumps(resolved_feature_flags),
                 resolved_max_accounts, resolved_daily_limit,
                 expires_at, now, now),
            )
            conn.commit()

            username = (self.get_user(user_id) or {}).get("username", "")
            self._audit(user_id, username,
                       AuditAction.API_KEY_CREATED, "api_key", key_id,
                       {"name": name, "plan": resolved_plan})

            return {
                "id": key_id,
                "key": raw_key,
                "key_prefix": key_prefix,
                "name": name,
                "permissions": permissions,
                "plan": resolved_plan,
                "feature_flags": resolved_feature_flags,
                "max_accounts": resolved_max_accounts,
                "daily_limit": resolved_daily_limit,
                "expires_at": expires_at,
            }
        finally:
            conn.close()

    def validate_api_key(self, raw_key: str) -> dict[str, Any] | None:
        """Validate an API key. Returns key data (including plan/limits) if valid."""
        key_hash = self._hash_api_key(raw_key)

        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                """SELECT k.*, u.id as user_id, u.role, u.plan as user_plan,
                          u.is_suspended
                   FROM api_keys k
                   JOIN users u ON k.user_id = u.id
                   WHERE k.key_hash = ? AND k.is_active = 1
                   AND u.is_active = 1 AND u.is_suspended = 0""",
                (key_hash,),
            )
            row = cursor.fetchone()
            if not row:
                return None

            key_data = dict(row)

            # Check expiry
            if key_data.get("expires_at"):
                expires = datetime.fromisoformat(key_data["expires_at"])
                if expires < datetime.now(timezone.utc):
                    return None

            # Parse feature_flags JSON
            try:
                key_data["feature_flags"] = json.loads(key_data.get("feature_flags", "{}"))
            except (json.JSONDecodeError, TypeError):
                key_data["feature_flags"] = {}

            # Check daily usage limit (0 = unlimited)
            daily_limit = key_data.get("daily_limit", 0)
            if daily_limit > 0:
                usage_count = key_data.get("usage_count", 0)
                usage_reset_at = key_data.get("usage_reset_at")
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                reset_day = ""
                if usage_reset_at:
                    try:
                        reset_day = datetime.fromisoformat(usage_reset_at).strftime("%Y-%m-%d")
                    except (ValueError, TypeError):
                        pass

                if reset_day != today:
                    # Reset counter for new day
                    usage_count = 0
                    conn.execute(
                        "UPDATE api_keys SET usage_count = 0, usage_reset_at = ? WHERE id = ?",
                        (datetime.now(timezone.utc).isoformat(), key_data["id"]),
                    )
                elif usage_count >= daily_limit:
                    return None  # Daily limit exceeded

            # Update last used and increment usage counter
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE api_keys SET last_used_at = ?, usage_count = usage_count + 1, usage_reset_at = COALESCE(usage_reset_at, ?) WHERE id = ?",
                (now, now, key_data["id"]),
            )
            conn.commit()

            return key_data
        finally:
            conn.close()

    def revoke_api_key(self, key_id: str) -> None:
        """Revoke an API key."""
        conn = self.db._get_conn()
        try:
            conn.execute(
                "UPDATE api_keys SET is_active = 0 WHERE id = ?",
                (key_id,),
            )
            conn.commit()
            
            self._audit("system", "system", AuditAction.API_KEY_REVOKED,
                       "api_key", key_id, {})
        finally:
            conn.close()

    def get_api_key_usage(self, key_id: str) -> dict[str, Any] | None:
        """Get usage stats for a specific API key."""
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                """SELECT id, key_prefix, name, plan, max_accounts, daily_limit,
                          usage_count, usage_reset_at, last_used_at, is_active, expires_at
                   FROM api_keys WHERE id = ?""",
                (key_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return dict(row)
        finally:
            conn.close()

    def reset_api_key_usage(self, key_id: str) -> None:
        """Reset the usage counter for an API key."""
        conn = self.db._get_conn()
        try:
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE api_keys SET usage_count = 0, usage_reset_at = ? WHERE id = ?",
                (now, key_id),
            )
            conn.commit()
        finally:
            conn.close()

    def list_api_keys(self, user_id: str) -> list[dict[str, Any]]:
        """List all API keys for a user (without the actual keys)."""
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                """SELECT id, key_prefix, name, permissions, plan, feature_flags,
                          max_accounts, daily_limit, is_active,
                          last_used_at, expires_at, created_at,
                          usage_count, usage_reset_at
                   FROM api_keys WHERE user_id = ? ORDER BY created_at DESC""",
                (user_id,),
            )
            rows = []
            for row in cursor.fetchall():
                d = dict(row)
                try:
                    d["feature_flags"] = json.loads(d.get("feature_flags", "{}"))
                except (json.JSONDecodeError, TypeError):
                    d["feature_flags"] = {}
                rows.append(d)
            return rows
        finally:
            conn.close()

    def get_api_key(self, key_id: str) -> dict[str, Any] | None:
        """Get a single API key by ID (without the raw key)."""
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                """SELECT k.*, u.username
                   FROM api_keys k
                   JOIN users u ON k.user_id = u.id
                   WHERE k.id = ?""",
                (key_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            d = dict(row)
            d.pop("key_hash", None)
            try:
                d["feature_flags"] = json.loads(d.get("feature_flags", "{}"))
            except (json.JSONDecodeError, TypeError):
                d["feature_flags"] = {}
            return d
        finally:
            conn.close()

    def list_all_api_keys(self) -> list[dict[str, Any]]:
        """List all API keys across all users (admin only)."""
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                """SELECT k.id, k.key_prefix, k.name, k.permissions,
                          k.plan, k.max_accounts, k.daily_limit,
                          k.is_active, k.last_used_at, k.expires_at,
                          k.created_at, k.usage_count, k.usage_reset_at,
                          u.username, u.id as user_id
                   FROM api_keys k
                   JOIN users u ON k.user_id = u.id
                   ORDER BY k.created_at DESC""",
            )
            rows = []
            for row in cursor.fetchall():
                d = dict(row)
                try:
                    d["feature_flags"] = json.loads(d.get("feature_flags", "{}"))
                except (json.JSONDecodeError, TypeError):
                    d["feature_flags"] = {}
                rows.append(d)
            return rows
        finally:
            conn.close()

    def update_api_key(
        self,
        key_id: str,
        name: str | None = None,
        permissions: str | None = None,
        plan: str | None = None,
        feature_flags: dict[str, bool] | None = None,
        max_accounts: int | None = None,
        daily_limit: int | None = None,
        is_active: bool | None = None,
        expires_in_days: int | None = None,
    ) -> dict[str, Any] | None:
        """Update an existing API key's attributes."""
        conn = self.db._get_conn()
        try:
            existing = conn.execute(
                "SELECT * FROM api_keys WHERE id = ?", (key_id,)
            ).fetchone()
            if not existing:
                return None

            updates = []
            params = []

            if name is not None:
                updates.append("name = ?")
                params.append(name)
            if permissions is not None:
                updates.append("permissions = ?")
                params.append(permissions)
            if plan is not None:
                updates.append("plan = ?")
                params.append(plan)
            if feature_flags is not None:
                updates.append("feature_flags = ?")
                params.append(json.dumps(feature_flags))
            if max_accounts is not None:
                updates.append("max_accounts = ?")
                params.append(max_accounts)
            if daily_limit is not None:
                updates.append("daily_limit = ?")
                params.append(daily_limit)
            if is_active is not None:
                updates.append("is_active = ?")
                params.append(1 if is_active else 0)
            if expires_in_days is not None:
                if expires_in_days > 0:
                    expires_at = (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat()
                else:
                    expires_at = None
                updates.append("expires_at = ?")
                params.append(expires_at)

            if not updates:
                return self.get_api_key(key_id)

            now = datetime.now(timezone.utc).isoformat()
            updates.append("last_used_at = COALESCE(last_used_at, ?)")
            params.append(now)
            params.append(key_id)

            conn.execute(
                f"UPDATE api_keys SET {', '.join(updates)} WHERE id = ?",
                params,
            )
            conn.commit()

            self._audit("system", "system", AuditAction.ADMIN_ACTION,
                       "api_key", key_id, {"updated": [u.split(" =")[0] for u in updates]})
            return self.get_api_key(key_id)
        finally:
            conn.close()

    # ═════════════════════════════════════════════════════════════════
    # 7. Trial Manager
    # ═════════════════════════════════════════════════════════════════

    def start_trial(self, user_id: str, days: int = 14) -> dict[str, Any]:
        """Start a trial period for a user."""
        now = datetime.now(timezone.utc)
        trial_end = now + timedelta(days=days)

        conn = self.db._get_conn()
        try:
            conn.execute(
                """UPDATE users SET
                   trial_started_at = ?, trial_ends_at = ?,
                   plan = 'pro', updated_at = ?
                   WHERE id = ?""",
                (now.isoformat(), trial_end.isoformat(), now.isoformat(), user_id),
            )
            conn.commit()

            self._audit("system", "system", AuditAction.TRIAL_STARTED,
                       "user", user_id, {"trial_days": days, "ends_at": trial_end.isoformat()})

            return {
                "trial_started": now.isoformat(),
                "trial_ends": trial_end.isoformat(),
                "plan": "pro",
            }
        finally:
            conn.close()

    def check_trial_status(self, user_id: str) -> dict[str, Any]:
        """Check if user's trial is active or expired."""
        user = self.get_user(user_id)
        if not user:
            return {"is_trial": False, "is_expired": True}
        
        trial_end = user.get("trial_ends_at")
        if not trial_end:
            return {"is_trial": False, "is_expired": False}
        
        try:
            end = datetime.fromisoformat(trial_end)
            now = datetime.now(timezone.utc)
            is_expired = now > end
            
            if is_expired and user.get("plan") != Plan.FREE:
                # Auto-downgrade to free
                self.change_plan(user_id, Plan.FREE)
                self._audit("system", "system", AuditAction.TRIAL_EXPIRED,
                           "user", user_id, {"trial_ended": trial_end})
            
            return {
                "is_trial": True,
                "is_expired": is_expired,
                "trial_started": user.get("trial_started_at"),
                "trial_ends": trial_end,
                "days_remaining": max(0, (end - now).days) if not is_expired else 0,
            }
        except (ValueError, TypeError):
            return {"is_trial": False, "is_expired": False}

    # ═════════════════════════════════════════════════════════════════
    # 8. Admin Dashboard
    # ═════════════════════════════════════════════════════════════════

    def get_dashboard_stats(self) -> dict[str, Any]:
        """Get system-wide statistics for admin dashboard."""
        conn = self.db._get_conn()
        try:
            # User stats
            total_users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
            active_users = conn.execute(
                "SELECT COUNT(*) as c FROM users WHERE is_active = 1 AND is_suspended = 0"
            ).fetchone()["c"]
            suspended_users = conn.execute(
                "SELECT COUNT(*) as c FROM users WHERE is_suspended = 1"
            ).fetchone()["c"]
            
            # Plan distribution
            plan_dist = {}
            cursor = conn.execute(
                "SELECT plan, COUNT(*) as c FROM users GROUP BY plan"
            )
            for row in cursor.fetchall():
                plan_dist[row["plan"]] = row["c"]
            
            # Today's usage
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            today_usage = conn.execute(
                """SELECT COALESCE(SUM(messages_sent), 0) as messages,
                          COALESCE(SUM(auto_replies_sent), 0) as auto_replies,
                          COALESCE(SUM(api_calls), 0) as api_calls
                   FROM usage_records WHERE date = ?""",
                (today,),
            ).fetchone()
            
            # Recent registrations (last 7 days)
            seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            new_users_7d = conn.execute(
                "SELECT COUNT(*) as c FROM users WHERE created_at >= ?",
                (seven_days_ago,),
            ).fetchone()["c"]
            
            # API keys count
            total_api_keys = conn.execute(
                "SELECT COUNT(*) as c FROM api_keys WHERE is_active = 1"
            ).fetchone()["c"]
            
            # Active trials
            active_trials = conn.execute(
                "SELECT COUNT(*) as c FROM users WHERE trial_ends_at > ?",
                (datetime.now(timezone.utc).isoformat(),),
            ).fetchone()["c"]
            
            return {
                "users": {
                    "total": total_users,
                    "active": active_users,
                    "suspended": suspended_users,
                    "new_last_7_days": new_users_7d,
                },
                "plans": plan_dist,
                "usage_today": dict(today_usage),
                "api_keys_total": total_api_keys,
                "active_trials": active_trials,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        finally:
            conn.close()

    # ═════════════════════════════════════════════════════════════════
    # 9. Audit Log
    # ═════════════════════════════════════════════════════════════════

    def _audit(
        self,
        user_id: str,
        username: str,
        action: AuditAction,
        resource_type: str | None = None,
        resource_id: str | None = None,
        details: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        success: bool = True,
    ) -> None:
        """Record an audit log entry."""
        try:
            conn = self.db._get_conn()
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                """INSERT INTO audit_logs
                   (id, timestamp, user_id, username, action, resource_type,
                    resource_id, details, ip_address, user_agent, success)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), now, user_id, username, action.value,
                 resource_type, resource_id, json.dumps(details or {}),
                 ip_address, user_agent, 1 if success else 0),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error("Failed to write audit log: %s", e)

    def get_audit_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        user_id: str | None = None,
        action: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get audit logs with optional filtering."""
        conn = self.db._get_conn()
        try:
            query = "SELECT * FROM audit_logs WHERE 1=1"
            params: list[Any] = []
            
            if user_id:
                query += " AND user_id = ?"
                params.append(user_id)
            if action:
                query += " AND action = ?"
                params.append(action)
            
            query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    # ═════════════════════════════════════════════════════════════════
    # 10. Billing Ready
    # ═════════════════════════════════════════════════════════════════

    def create_subscription(
        self,
        user_id: str,
        plan: str,
        stripe_subscription_id: str | None = None,
        stripe_price_id: str | None = None,
    ) -> dict[str, Any]:
        """Create a subscription record."""
        sub_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30)
        
        conn = self.db._get_conn()
        try:
            conn.execute(
                """INSERT INTO subscriptions
                   (id, user_id, plan, status, current_period_start,
                    current_period_end, stripe_subscription_id,
                    stripe_price_id, created_at, updated_at)
                   VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)""",
                (sub_id, user_id, plan, now.isoformat(), period_end.isoformat(),
                 stripe_subscription_id, stripe_price_id, now.isoformat(), now.isoformat()),
            )
            
            # Update user
            conn.execute(
                "UPDATE users SET subscription_id = ?, subscription_status = 'active', "
                "plan = ?, updated_at = ? WHERE id = ?",
                (sub_id, plan, now.isoformat(), user_id),
            )
            conn.commit()
            
            self._audit("system", "system", AuditAction.SUBSCRIPTION_CREATED,
                       "subscription", sub_id, {"plan": plan})
            
            return {
                "id": sub_id,
                "plan": plan,
                "status": "active",
                "current_period_start": now.isoformat(),
                "current_period_end": period_end.isoformat(),
            }
        finally:
            conn.close()

    def cancel_subscription(self, subscription_id: str) -> dict[str, Any]:
        """Cancel a subscription."""
        conn = self.db._get_conn()
        try:
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE subscriptions SET status = 'cancelled', "
                "cancel_at_period_end = 1, updated_at = ? WHERE id = ?",
                (now, subscription_id),
            )
            conn.commit()
            
            self._audit("system", "system", AuditAction.SUBSCRIPTION_CANCELLED,
                       "subscription", subscription_id, {})
            
            return {"status": "cancelled", "cancelled_at": now}
        finally:
            conn.close()

    def create_invoice(
        self,
        user_id: str,
        amount_cents: int,
        subscription_id: str | None = None,
        stripe_invoice_id: str | None = None,
    ) -> dict[str, Any]:
        """Create an invoice record (billing ready)."""
        inv_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        conn = self.db._get_conn()
        try:
            conn.execute(
                """INSERT INTO invoices
                   (id, user_id, subscription_id, amount_cents, status,
                    stripe_invoice_id, due_date, created_at)
                   VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)""",
                (inv_id, user_id, subscription_id, amount_cents,
                 stripe_invoice_id, now, now),
            )
            conn.commit()
            
            self._audit("system", "system", AuditAction.INVOICE_CREATED,
                       "invoice", inv_id, {"amount_cents": amount_cents})
            
            return {"id": inv_id, "amount_cents": amount_cents, "status": "pending"}
        finally:
            conn.close()

    def get_subscription(self, user_id: str) -> dict[str, Any] | None:
        """Get active subscription for a user."""
        conn = self.db._get_conn()
        try:
            cursor = conn.execute(
                """SELECT * FROM subscriptions
                   WHERE user_id = ? AND status = 'active'
                   ORDER BY created_at DESC LIMIT 1""",
                (user_id,),
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    # ═════════════════════════════════════════════════════════════════
    # Internal Helpers
    # ═════════════════════════════════════════════════════════════════

    def update_password(self, user_id: str, new_password: str) -> None:
        """Update a user's password hash."""
        password_hash = self._hash_password(new_password)
        now = datetime.now(timezone.utc).isoformat()
        conn = self.db._get_conn()
        try:
            conn.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (password_hash, now, user_id),
            )
            conn.commit()
        finally:
            conn.close()
        logger.info("Password updated for user %s", user_id)

    def _hash_password(self, password: str) -> str:
        """Hash a password using SHA-256 with salt."""
        salt = secrets.token_hex(16)
        pwd_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
        )
        return f"{salt}${pwd_hash.hex()}"

    def _verify_password(self, password: str, stored_hash: str) -> bool:
        """Verify a password against stored hash."""
        try:
            salt, pwd_hash = stored_hash.split("$", 1)
            computed = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
            )
            return hmac.compare_digest(computed.hex(), pwd_hash)
        except (ValueError, AttributeError):
            return False

    def _hash_api_key(self, key: str) -> str:
        """Hash an API key for storage."""
        return hashlib.sha256(key.encode("utf-8")).hexdigest()