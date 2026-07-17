"""
Flask application factory for Sidra Video Downloader.

Usage::

    from app import create_app
    app = create_app()
"""

from __future__ import annotations

import os

from flask import Flask, jsonify
from flask_cors import CORS

from app.extensions import celery_app, db, jwt, migrate, socketio
from app.utils.jwt_helpers import register_jwt_callbacks
from config import config_by_name


def create_app(config_name: str | None = None) -> Flask:
    """
    Create and configure the Flask application.

    Parameters
    ----------
    config_name : str, optional
        One of ``"development"``, ``"production"``, ``"testing"``.
        Defaults to the ``FLASK_ENV`` / ``APP_ENV`` environment
        variable, falling back to ``"development"``.
    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", os.getenv("APP_ENV", "development"))

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # ── Initialise extensions ───────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    CORS(
        app,
        origins=app.config.get("CORS_ORIGINS", ["http://localhost:5173"]),
        supports_credentials=True,
    )

    socketio.init_app(
        app,
        cors_allowed_origins=app.config.get("CORS_ORIGINS", "*"),
        message_queue=app.config.get("CELERY_BROKER_URL"),
        async_mode="eventlet",
    )

    # ── Celery configuration ────────────────────────────────────────
    _init_celery(app)

    # ── JWT callbacks ───────────────────────────────────────────────
    register_jwt_callbacks(jwt)

    # ── Register blueprints ─────────────────────────────────────────
    from app.routes import (
        auth_bp,
        downloads_bp,
        logs_bp,
        media_bp,
        settings_bp,
        users_bp,
    )

    app.register_blueprint(auth_bp)
    app.register_blueprint(downloads_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(media_bp)

    # ── Error handlers ──────────────────────────────────────────────
    _register_error_handlers(app)

    # ── Health-check ────────────────────────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify(
            success=True,
            data={"status": "healthy"},
            message="Sidra Video Downloader API is running.",
        )

    # ── Ensure download directories exist ───────────────────────────
    with app.app_context():
        for key in ("DOWNLOAD_VIDEO_PATH", "DOWNLOAD_AUDIO_PATH"):
            path = app.config.get(key)
            if path:
                os.makedirs(path, exist_ok=True)

    return app


# ── Internal helpers ────────────────────────────────────────────────

def _init_celery(app: Flask) -> None:
    """
    Bind the shared ``celery_app`` instance to the Flask app's
    configuration so tasks run inside an application context.
    """
    celery_app.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["CELERY_RESULT_BACKEND"],
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_acks_late=True,
        worker_prefetch_multiplier=1,
    )

    class ContextTask(celery_app.Task):
        """Wrap every task execution in a Flask app context."""

        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app.Task = ContextTask


def _register_error_handlers(app: Flask) -> None:
    """Attach consistent JSON error handlers for common HTTP errors."""

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify(success=False, message="Bad request."), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify(success=False, message="Unauthorized."), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify(success=False, message="Forbidden."), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify(success=False, message="Resource not found."), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify(success=False, message="Internal server error."), 500
