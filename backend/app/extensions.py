"""
Shared extension instances for the Sidra Video Downloader backend.

Instantiated here so they can be imported by any module without
circular-import issues. They are initialised with the Flask app
inside the application factory (``create_app``).
"""

from celery import Celery
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
socketio = SocketIO()
celery_app = Celery("sidra_downloader")
