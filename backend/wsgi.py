"""
WSGI / Gunicorn entry point for Sidra Video Downloader.

Run with::

    gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 wsgi:app
"""

from app import create_app
from app.extensions import socketio

app = create_app()

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
