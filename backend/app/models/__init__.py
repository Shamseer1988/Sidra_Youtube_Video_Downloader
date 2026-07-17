"""
Models package — import all models so that SQLAlchemy and Alembic
can discover them.
"""

from app.models.download import Download  # noqa: F401
from app.models.log import Log  # noqa: F401
from app.models.setting import Setting  # noqa: F401
from app.models.user import User  # noqa: F401
