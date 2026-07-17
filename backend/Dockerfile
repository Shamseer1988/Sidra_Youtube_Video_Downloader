FROM python:3.12-slim

# Install ffmpeg for media processing (thumbnails, audio extraction)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create default download directories
RUN mkdir -p /downloads/video /downloads/audio

# Environment defaults
ENV FLASK_ENV=production \
    DOWNLOAD_VIDEO_PATH=/downloads/video \
    DOWNLOAD_AUDIO_PATH=/downloads/audio

EXPOSE 5000

# Run with gunicorn + eventlet for WebSocket support
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "wsgi:app"]
