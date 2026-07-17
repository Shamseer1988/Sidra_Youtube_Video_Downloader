# API Reference

> Complete REST API documentation for Sidra Video Downloader.

**Base URL**: `http://localhost:5000/api`

**Authentication**: JWT Bearer Token (except login endpoint)

**Content-Type**: `application/json`

---

## Table of Contents

- [Authentication](#authentication)
- [Downloads](#downloads)
- [Users](#users-admin)
- [Settings](#settings)
- [Logs](#logs)
- [Media](#media)
- [WebSocket Events](#websocket-events)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

---

## Authentication

### POST /api/auth/login

Authenticate and receive a JWT token.

**Request:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**

```json
{
  "access_token": "eyJ0eXAiOiJKV1Qi...",
  "refresh_token": "eyJ0eXAiOiJKV1Qi...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@sidra.local",
    "role": "admin",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error (401):**

```json
{
  "error": "Invalid credentials",
  "message": "Username or password is incorrect"
}
```

---

### POST /api/auth/logout

Invalidate the current access token.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "message": "Successfully logged out"
}
```

---

### POST /api/auth/refresh

Refresh an expired access token.

**Headers:**

```
Authorization: Bearer <refresh_token>
```

**Response (200):**

```json
{
  "access_token": "eyJ0eXAiOiJKV1Qi..."
}
```

---

### GET /api/auth/me

Get the current authenticated user's profile.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@sidra.local",
  "role": "admin",
  "created_at": "2024-01-15T10:30:00Z",
  "downloads_count": 42,
  "settings": {
    "default_video_quality": "1080p",
    "default_audio_format": "mp3"
  }
}
```

---

## Downloads

### POST /api/downloads

Start a new download.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request:**

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "type": "video",
  "quality": "1080p",
  "format": "mp4"
}
```

| Field     | Type   | Required | Description                                       |
| --------- | ------ | -------- | ------------------------------------------------- |
| `url`     | string | Yes      | URL of the video/audio to download                |
| `type`    | string | Yes      | `video` or `audio`                                |
| `quality` | string | No       | Video: `2160p`, `1080p`, `720p`, `480p`, `360p`   |
| `format`  | string | No       | Video: `mp4`, `mkv`, `webm`. Audio: `mp3`, `m4a`, `flac`, `wav` |

**Response (201):**

```json
{
  "id": 1,
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "status": "pending",
  "type": "video",
  "quality": "1080p",
  "format": "mp4",
  "progress": 0,
  "file_size": null,
  "file_path": null,
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "duration": 213,
  "created_at": "2024-01-15T10:30:00Z",
  "user_id": 1
}
```

---

### GET /api/downloads

List all downloads for the authenticated user.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type    | Default | Description                              |
| --------- | ------- | ------- | ---------------------------------------- |
| `page`    | integer | 1       | Page number                              |
| `per_page`| integer | 20      | Items per page (max 100)                 |
| `status`  | string  | —       | Filter: `pending`, `downloading`, `completed`, `failed` |
| `type`    | string  | —       | Filter: `video`, `audio`                 |
| `search`  | string  | —       | Search in title                          |
| `sort`    | string  | `-created_at` | Sort field (prefix `-` for descending) |

**Response (200):**

```json
{
  "downloads": [
    {
      "id": 1,
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up",
      "status": "completed",
      "type": "video",
      "quality": "1080p",
      "format": "mp4",
      "progress": 100,
      "file_size": 52428800,
      "file_path": "/downloads/videos/never_gonna_give_you_up.mp4",
      "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      "duration": 213,
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:32:15Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### GET /api/downloads/:id

Get a specific download by ID.

**Response (200):**

```json
{
  "id": 1,
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "status": "completed",
  "type": "video",
  "quality": "1080p",
  "format": "mp4",
  "progress": 100,
  "file_size": 52428800,
  "file_path": "/downloads/videos/never_gonna_give_you_up.mp4",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "duration": 213,
  "channel": "Rick Astley",
  "description": "The official video for...",
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:32:15Z",
  "error_message": null
}
```

---

### DELETE /api/downloads/:id

Delete a download record and optionally the file.

**Query Parameters:**

| Parameter     | Type    | Default | Description                    |
| ------------- | ------- | ------- | ------------------------------ |
| `delete_file` | boolean | false   | Also delete the downloaded file |

**Response (200):**

```json
{
  "message": "Download deleted successfully"
}
```

---

### POST /api/downloads/info

Fetch video/audio information without downloading.

**Request:**

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response (200):**

```json
{
  "title": "Rick Astley - Never Gonna Give You Up",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "duration": 213,
  "channel": "Rick Astley",
  "upload_date": "2009-10-25",
  "view_count": 1500000000,
  "description": "The official video for...",
  "formats": [
    {
      "format_id": "137+140",
      "quality": "1080p",
      "ext": "mp4",
      "filesize_approx": 52428800
    },
    {
      "format_id": "136+140",
      "quality": "720p",
      "ext": "mp4",
      "filesize_approx": 31457280
    }
  ],
  "is_playlist": false
}
```

---

### POST /api/downloads/playlist-info

Fetch playlist information.

**Request:**

```json
{
  "url": "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"
}
```

**Response (200):**

```json
{
  "title": "My Playlist",
  "channel": "Channel Name",
  "video_count": 15,
  "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg",
  "videos": [
    {
      "index": 1,
      "title": "Video 1",
      "url": "https://www.youtube.com/watch?v=...",
      "duration": 240,
      "thumbnail": "https://i.ytimg.com/vi/.../default.jpg"
    },
    {
      "index": 2,
      "title": "Video 2",
      "url": "https://www.youtube.com/watch?v=...",
      "duration": 180,
      "thumbnail": "https://i.ytimg.com/vi/.../default.jpg"
    }
  ]
}
```

---

### POST /api/downloads/:id/retry

Retry a failed download.

**Response (200):**

```json
{
  "id": 1,
  "status": "pending",
  "message": "Download queued for retry"
}
```

---

### POST /api/downloads/:id/cancel

Cancel a pending or in-progress download.

**Response (200):**

```json
{
  "id": 1,
  "status": "cancelled",
  "message": "Download cancelled"
}
```

---

## Users (Admin)

> [!NOTE]
> All user management endpoints require the `admin` role.

### GET /api/users

List all users.

**Headers:**

```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**

| Parameter | Type    | Default | Description      |
| --------- | ------- | ------- | ---------------- |
| `page`    | integer | 1       | Page number      |
| `per_page`| integer | 20      | Items per page   |

**Response (200):**

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@sidra.local",
      "role": "admin",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-20T08:15:00Z",
      "downloads_count": 42
    },
    {
      "id": 2,
      "username": "user1",
      "email": "user1@example.com",
      "role": "user",
      "is_active": true,
      "created_at": "2024-01-16T14:00:00Z",
      "last_login": "2024-01-19T22:00:00Z",
      "downloads_count": 12
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

---

### POST /api/users

Create a new user.

**Request:**

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "securepassword",
  "role": "user"
}
```

**Response (201):**

```json
{
  "id": 3,
  "username": "newuser",
  "email": "newuser@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2024-01-20T10:00:00Z"
}
```

---

### GET /api/users/:id

Get a specific user.

**Response (200):**

```json
{
  "id": 2,
  "username": "user1",
  "email": "user1@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2024-01-16T14:00:00Z",
  "last_login": "2024-01-19T22:00:00Z",
  "downloads_count": 12
}
```

---

### PUT /api/users/:id

Update a user.

**Request:**

```json
{
  "email": "updated@example.com",
  "role": "admin",
  "is_active": true
}
```

**Response (200):**

```json
{
  "id": 2,
  "username": "user1",
  "email": "updated@example.com",
  "role": "admin",
  "is_active": true,
  "created_at": "2024-01-16T14:00:00Z"
}
```

---

### DELETE /api/users/:id

Delete a user and optionally their downloads.

**Query Parameters:**

| Parameter          | Type    | Default | Description                    |
| ------------------ | ------- | ------- | ------------------------------ |
| `delete_downloads` | boolean | false   | Also delete user's downloads   |

**Response (200):**

```json
{
  "message": "User deleted successfully"
}
```

---

## Settings

### GET /api/settings

Get application settings.

**Response (200):**

```json
{
  "download": {
    "default_video_quality": "1080p",
    "default_audio_format": "mp3",
    "max_concurrent_downloads": 3,
    "video_path": "/downloads/videos",
    "audio_path": "/downloads/audios",
    "filename_template": "%(title)s.%(ext)s"
  },
  "application": {
    "app_name": "Sidra Video Downloader",
    "theme": "dark",
    "language": "en",
    "notifications_enabled": true
  },
  "ytdlp": {
    "version": "2024.12.06",
    "cookies_enabled": false,
    "proxy": null,
    "rate_limit": null,
    "geo_bypass": true
  }
}
```

---

### PUT /api/settings

Update application settings.

**Request:**

```json
{
  "download": {
    "default_video_quality": "720p",
    "max_concurrent_downloads": 2
  },
  "ytdlp": {
    "rate_limit": "10M",
    "geo_bypass": true
  }
}
```

**Response (200):**

```json
{
  "message": "Settings updated successfully",
  "settings": { ... }
}
```

---

## Logs

### GET /api/logs

Get application logs.

**Headers:**

```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**

| Parameter | Type    | Default | Description                              |
| --------- | ------- | ------- | ---------------------------------------- |
| `page`    | integer | 1       | Page number                              |
| `per_page`| integer | 50      | Items per page                           |
| `level`   | string  | —       | Filter: `info`, `warning`, `error`       |
| `source`  | string  | —       | Filter: `download`, `auth`, `system`     |
| `from`    | string  | —       | Start date (ISO 8601)                    |
| `to`      | string  | —       | End date (ISO 8601)                      |

**Response (200):**

```json
{
  "logs": [
    {
      "id": 100,
      "level": "info",
      "source": "download",
      "message": "Download completed: Never Gonna Give You Up",
      "details": {
        "download_id": 1,
        "file_size": 52428800,
        "duration_seconds": 135
      },
      "user_id": 1,
      "created_at": "2024-01-15T10:32:15Z"
    },
    {
      "id": 99,
      "level": "error",
      "source": "download",
      "message": "Download failed: Video unavailable",
      "details": {
        "download_id": 2,
        "error": "This video is not available in your country"
      },
      "user_id": 1,
      "created_at": "2024-01-15T10:35:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 100,
    "total_pages": 2
  }
}
```

---

### DELETE /api/logs

Clear logs (admin only).

**Query Parameters:**

| Parameter | Type   | Default | Description                 |
| --------- | ------ | ------- | --------------------------- |
| `before`  | string | —       | Clear logs before date      |
| `level`   | string | —       | Clear only specific level   |

**Response (200):**

```json
{
  "message": "Logs cleared successfully",
  "deleted_count": 85
}
```

---

## Media

### GET /api/media/videos

Browse downloaded video files.

**Query Parameters:**

| Parameter | Type   | Default | Description            |
| --------- | ------ | ------- | ---------------------- |
| `path`    | string | `/`     | Subdirectory to browse |
| `search`  | string | —       | Search by filename     |

**Response (200):**

```json
{
  "path": "/",
  "files": [
    {
      "name": "never_gonna_give_you_up.mp4",
      "path": "/downloads/videos/never_gonna_give_you_up.mp4",
      "size": 52428800,
      "modified_at": "2024-01-15T10:32:15Z",
      "type": "video/mp4",
      "duration": 213,
      "thumbnail": "/api/media/thumbnail/never_gonna_give_you_up.mp4"
    }
  ],
  "directories": []
}
```

---

### GET /api/media/audios

Browse downloaded audio files. Same structure as videos endpoint.

---

### GET /api/media/stream/:filename

Stream a media file for playback.

**Response**: Binary file stream with appropriate `Content-Type` header.

**Headers:**

```
Content-Type: video/mp4
Accept-Ranges: bytes
Content-Length: 52428800
```

Supports `Range` header for seeking.

---

### GET /api/media/download/:filename

Download a media file (triggers browser download).

**Response**: Binary file with `Content-Disposition: attachment` header.

---

### DELETE /api/media/:filename

Delete a media file from disk.

**Response (200):**

```json
{
  "message": "File deleted successfully"
}
```

---

## WebSocket Events

Connect to the WebSocket server at `ws://localhost:5000` using Socket.IO.

### Connection

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: "your-jwt-access-token"
  }
});
```

### Events (Server → Client)

#### `download:progress`

Emitted during download progress updates.

```json
{
  "download_id": 1,
  "progress": 45.5,
  "speed": "5.2 MiB/s",
  "eta": "00:01:23",
  "downloaded_bytes": 23891034,
  "total_bytes": 52428800,
  "status": "downloading"
}
```

#### `download:completed`

Emitted when a download finishes successfully.

```json
{
  "download_id": 1,
  "title": "Rick Astley - Never Gonna Give You Up",
  "status": "completed",
  "file_path": "/downloads/videos/never_gonna_give_you_up.mp4",
  "file_size": 52428800,
  "duration_seconds": 135
}
```

#### `download:failed`

Emitted when a download fails.

```json
{
  "download_id": 1,
  "title": "Some Video",
  "status": "failed",
  "error": "Video is unavailable in your country"
}
```

#### `download:queued`

Emitted when a download is added to the queue.

```json
{
  "download_id": 1,
  "title": "Video Title",
  "status": "pending",
  "position": 3
}
```

### Events (Client → Server)

#### `download:cancel`

Request to cancel an in-progress download.

```json
{
  "download_id": 1
}
```

---

## Error Codes

All errors follow a consistent format:

```json
{
  "error": "Short error code",
  "message": "Human-readable description",
  "details": {}
}
```

### HTTP Status Codes

| Code | Description           | Common Causes                          |
| ---- | --------------------- | -------------------------------------- |
| 200  | OK                    | Successful request                     |
| 201  | Created               | Resource created successfully          |
| 400  | Bad Request           | Invalid input, missing fields          |
| 401  | Unauthorized          | Missing or invalid token               |
| 403  | Forbidden             | Insufficient permissions (not admin)   |
| 404  | Not Found             | Resource doesn't exist                 |
| 409  | Conflict              | Duplicate resource (username/email)    |
| 422  | Unprocessable Entity  | Invalid URL, unsupported site          |
| 429  | Too Many Requests     | Rate limit exceeded                    |
| 500  | Internal Server Error | Server-side error                      |

### Application Error Codes

| Error Code              | Description                              |
| ----------------------- | ---------------------------------------- |
| `INVALID_CREDENTIALS`   | Wrong username or password               |
| `TOKEN_EXPIRED`         | JWT access token has expired             |
| `TOKEN_INVALID`         | JWT token is malformed or tampered       |
| `USER_NOT_FOUND`        | Requested user does not exist            |
| `USER_DISABLED`         | User account is deactivated              |
| `DUPLICATE_USER`        | Username or email already exists         |
| `INVALID_URL`           | Provided URL is not a valid video URL    |
| `UNSUPPORTED_SITE`      | yt-dlp does not support this website     |
| `DOWNLOAD_FAILED`       | yt-dlp failed to download the content    |
| `DOWNLOAD_NOT_FOUND`    | Download record does not exist           |
| `FILE_NOT_FOUND`        | Downloaded file is missing from disk     |
| `QUOTA_EXCEEDED`        | User has exceeded download limits        |
| `RATE_LIMITED`           | Too many requests in a short period      |

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

| Endpoint Group   | Limit              | Window    |
| ---------------- | ------------------ | --------- |
| Authentication   | 10 requests        | 1 minute  |
| Downloads (POST) | 30 requests        | 1 minute  |
| Downloads (GET)  | 120 requests       | 1 minute  |
| Info endpoints   | 20 requests        | 1 minute  |
| General API      | 200 requests       | 1 minute  |

When rate limited, the response includes headers:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705312800
Retry-After: 45
```

**Response (429):**

```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests. Please try again in 45 seconds.",
  "retry_after": 45
}
```
