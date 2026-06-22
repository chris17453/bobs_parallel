"""Authentication business logic: local accounts, dev-login, OAuth upsert, QR reset.

No Flask globals here — routes pass plain values in and persist the returned user id to the
session themselves. Time is injectable so tests stay deterministic (no real-clock reliance).
"""
import secrets
from datetime import datetime, timedelta, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from ..errors import BadRequest, Conflict, NotFound, Unauthorized
from ..extensions import db
from ..models import PasswordReset, User
from ..repositories import PasswordResetRepository, UserRepository

RESET_TTL_MINUTES = 30
MIN_PASSWORD_LEN = 6


class AuthService:
    def __init__(self, users=None, resets=None, clock=None):
        self.users = users or UserRepository()
        self.resets = resets or PasswordResetRepository()
        # clock() -> aware datetime; injectable for tests.
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    # ---- local accounts ----
    def signup(self, username, display_name, password):
        username = (username or "").strip().lower()
        if not username or not username.isalnum():
            raise BadRequest("invalid_username")
        if len(password or "") < MIN_PASSWORD_LEN:
            raise BadRequest("weak_password")
        if self.users.get_by_username(username) is not None:
            raise Conflict("username_taken")
        user = User(
            id=f"local-{username}",
            username=username,
            display_name=(display_name or username).strip(),
            password_hash=generate_password_hash(password),
            avatar_url=f"https://picsum.photos/seed/local-{username}/200/200",
            is_seed=False,
        )
        self.users.add(user)
        db.session.commit()
        return user

    def login_local(self, username, password):
        username = (username or "").strip().lower()
        user = self.users.get_by_username(username)
        if user is None or not user.password_hash:
            raise Unauthorized("bad_credentials")
        if not check_password_hash(user.password_hash, password or ""):
            raise Unauthorized("bad_credentials")
        return user

    # ---- dev login (offline only) ----
    def dev_login(self):
        uid = "dev-you"
        user = self.users.get(uid)
        if user is None:
            user = User(
                id=uid,
                display_name="You (dev)",
                avatar_url="https://picsum.photos/seed/dev-you/200/200",
                is_seed=True,
            )
            self.users.add(user)
            db.session.commit()
        return user

    # ---- Spotify OAuth upsert ----
    def upsert_spotify_user(self, profile):
        """profile = Spotify /me payload."""
        user = self.users.get(profile["id"])
        if user is None:
            user = User(id=profile["id"], is_seed=False)
            self.users.add(user)
        user.display_name = profile.get("display_name") or profile["id"]
        user.email = profile.get("email")
        images = profile.get("images") or []
        user.avatar_url = images[0]["url"] if images else None
        db.session.commit()
        return user

    # ---- QR / URL password reset (no email) ----
    def request_reset(self, username, base_url):
        """Create a single-use token and return the capability URL to render as a QR code."""
        username = (username or "").strip().lower()
        user = self.users.get_by_username(username)
        if user is None or not user.password_hash:
            # Don't reveal which usernames exist.
            raise NotFound("no_local_account")
        token = secrets.token_urlsafe(32)
        reset = PasswordReset(
            token=token,
            user_id=user.id,
            expires_at=self.clock() + timedelta(minutes=RESET_TTL_MINUTES),
            used=False,
        )
        self.resets.add(reset)
        db.session.commit()
        return f"{base_url.rstrip('/')}/reset?token={token}"

    def perform_reset(self, token, new_password):
        reset = self.resets.get(token)
        if reset is None or reset.used:
            raise BadRequest("invalid_token")
        if self.clock() > _as_aware(reset.expires_at):
            raise BadRequest("expired_token")
        if len(new_password or "") < MIN_PASSWORD_LEN:
            raise BadRequest("weak_password")
        user = self.users.get(reset.user_id)
        if user is None:
            raise NotFound("user_not_found")
        user.password_hash = generate_password_hash(new_password)
        reset.used = True  # single-use: invalidate immediately
        db.session.commit()
        return user


def _as_aware(dt):
    """SQLite may return naive datetimes; treat stored times as UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
