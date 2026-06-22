import os
from datetime import timedelta


def _bool_env(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


class Config:
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-insecure-secret")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg2://parallel:parallel@localhost:5432/parallel",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:5000")

    SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID", "")
    SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
    SPOTIFY_REDIRECT_URI = os.environ.get(
        "SPOTIFY_REDIRECT_URI", "http://localhost:5000/auth/callback"
    )

    # Session cookie needs to survive the OAuth redirect round-trip.
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_HTTPONLY = True
    # Enable behind HTTPS in prod (SESSION_COOKIE_SECURE=true). Off by default so the
    # http demo works; cookies won't be sent over plain http when this is on.
    SESSION_COOKIE_SECURE = _bool_env("SESSION_COOKIE_SECURE", False)
    PERMANENT_SESSION_LIFETIME = timedelta(
        days=int(os.environ.get("SESSION_DAYS", "30"))
    )

    # Rate limiting (flask-limiter). In prod point RATELIMIT_STORAGE_URI at redis for
    # multi-process correctness; in-memory is fine for a single instance / dev.
    RATELIMIT_ENABLED = _bool_env("RATELIMIT_ENABLED", True)
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True

    @property
    def spotify_enabled(self):
        return bool(self.SPOTIFY_CLIENT_ID and self.SPOTIFY_CLIENT_SECRET)
