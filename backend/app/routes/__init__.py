"""
Routes package — re-exports all blueprints for easy registration.
"""

from app.routes.auth import auth_bp  # noqa: F401
from app.routes.downloads import downloads_bp  # noqa: F401
from app.routes.logs import logs_bp  # noqa: F401
from app.routes.media import media_bp  # noqa: F401
from app.routes.settings import settings_bp  # noqa: F401
from app.routes.users import users_bp  # noqa: F401
