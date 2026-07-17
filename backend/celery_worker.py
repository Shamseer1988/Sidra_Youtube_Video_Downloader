"""
Celery worker entry point for Sidra Video Downloader.

Start the worker with::

    celery -A celery_worker.celery_app worker --loglevel=info
"""

from app import create_app
from app.extensions import celery_app

# Create the Flask app so Celery tasks have access to the app context
app = create_app()
app.app_context().push()

# Import tasks so they are registered with the Celery app
import app.tasks.download_tasks  # noqa: F401, E402
