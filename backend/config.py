"""
Application configuration classes for Sidra Video Downloader.

Loads settings from environment variables with sensible defaults
for development, production, and testing environments.
"""

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class BaseConfig:
    """Base configuration shared across all environments."""

    # ── Core Flask ──────────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    DEBUG = False
    TESTING = False

    # ── Database (PostgreSQL) ───────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/sidra_downloader",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    }

    # ── JWT ──────────────────────────────────────────────────────────
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-change-me-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_CSRF_PROTECT = (
        os.getenv("JWT_COOKIE_CSRF_PROTECT", "true").lower() == "true"
    )
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_ACCESS_COOKIE_NAME = "access_token_cookie"
    JWT_REFRESH_COOKIE_NAME = "refresh_token_cookie"
    JWT_ACCESS_COOKIE_PATH = "/api/"
    JWT_REFRESH_COOKIE_PATH = "/api/auth/refresh"

    # ── Celery (Redis) ──────────────────────────────────────────────
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = os.getenv(
        "CELERY_RESULT_BACKEND", "redis://localhost:6379/0"
    )

    # ── Redis (general) ─────────────────────────────────────────────
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")

    # ── Download / Media Paths ──────────────────────────────────────
    DOWNLOAD_VIDEO_PATH = os.getenv(
        "DOWNLOAD_VIDEO_PATH",
        os.path.join(os.path.expanduser("~"), "Downloads", "SidraVideos"),
    )
    DOWNLOAD_AUDIO_PATH = os.getenv(
        "DOWNLOAD_AUDIO_PATH",
        os.path.join(os.path.expanduser("~"), "Downloads", "SidraAudio"),
    )
    MEDIA_VIDEO_PATH = os.getenv("MEDIA_VIDEO_PATH", "")
    MEDIA_AUDIO_PATH = os.getenv("MEDIA_AUDIO_PATH", "")

    # ── CORS ─────────────────────────────────────────────────────────
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    DEBUG = True
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = False


class ProductionConfig(BaseConfig):
    """Production environment configuration."""

    DEBUG = False
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_CSRF_PROTECT = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_size": 20,
        "max_overflow": 40,
    }


class TestingConfig(BaseConfig):
    """Testing environment configuration."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/sidra_downloader_test",
    )
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = False


# Mapping for convenient selection via FLASK_ENV / APP_ENV
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
