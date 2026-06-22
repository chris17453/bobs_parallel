from datetime import datetime, timezone

from .extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    # Spotify id, `local-<username>`, or `dev-you`.
    id = db.Column(db.String(64), primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=True, index=True)
    display_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    avatar_url = db.Column(db.String(1024), nullable=True)
    password_hash = db.Column(db.String(512), nullable=True)  # local accounts only
    is_seed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def to_base_dict(self):
        """Plain identity. Query-derived fields (is_following) are added by services."""
        return {
            "id": self.id,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "is_seed": self.is_seed,
        }


class Follow(db.Model):
    """Asymmetric follow: follower_id follows followed_id."""

    __tablename__ = "follows"

    follower_id = db.Column(
        db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    followed_id = db.Column(
        db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)


class FeedItem(db.Model):
    """A cached piece of Spotify content (track / album / artist)."""

    __tablename__ = "feed_items"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    spotify_id = db.Column(db.String(128), unique=True, nullable=False, index=True)
    kind = db.Column(db.String(16), nullable=False)  # track | album | artist
    title = db.Column(db.String(512), nullable=False)
    subtitle = db.Column(db.String(512), nullable=True)
    image_url = db.Column(db.String(1024), nullable=True)
    preview_url = db.Column(db.String(1024), nullable=True)  # 30s mp3 (tracks)
    spotify_url = db.Column(db.String(1024), nullable=True)
    popularity = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def to_base_dict(self):
        """Plain content. like_count/liked are added by services."""
        return {
            "id": self.id,
            "spotify_id": self.spotify_id,
            "kind": self.kind,
            "title": self.title,
            "subtitle": self.subtitle,
            "image_url": self.image_url,
            "preview_url": self.preview_url,
            "spotify_url": self.spotify_url,
            "popularity": self.popularity,
        }


class Like(db.Model):
    __tablename__ = "likes"

    user_id = db.Column(
        db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    item_id = db.Column(
        db.Integer, db.ForeignKey("feed_items.id", ondelete="CASCADE"), primary_key=True
    )
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)


class PasswordReset(db.Model):
    """Single-use, short-TTL capability token for QR/URL based reset (no email)."""

    __tablename__ = "password_resets"

    token = db.Column(db.String(128), primary_key=True)
    user_id = db.Column(
        db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
