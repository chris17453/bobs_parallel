import os


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

    @property
    def spotify_enabled(self):
        return bool(self.SPOTIFY_CLIENT_ID and self.SPOTIFY_CLIENT_SECRET)
