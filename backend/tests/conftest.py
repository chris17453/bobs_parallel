"""Pytest fixtures. SQLite in-memory, mock Spotify, deterministic — no network, no clock dep."""
import os
import sys

import pytest

# Make `app` importable when running pytest from backend/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from app.config import Config  # noqa: E402
from app.extensions import db as _db  # noqa: E402


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret"
    # No Spotify creds -> mock client + dev-login enabled.
    SPOTIFY_CLIENT_ID = ""
    SPOTIFY_CLIENT_SECRET = ""
    PUBLIC_BASE_URL = "http://test.local"


@pytest.fixture
def app():
    app = create_app(TestConfig)
    yield app
    with app.app_context():
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    with app.app_context():
        yield _db


@pytest.fixture
def seeded(app):
    """A small deterministic dataset inside the app context."""
    from app.spotify_client import MockSpotifyClient
    from scanner.scan_spotify import scan, seed_demo

    with app.app_context():
        scan(app, limit=30)
        seed_demo(app)
        yield
