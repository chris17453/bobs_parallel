"""Editing your own profile (display name + avatar)."""
from ..errors import BadRequest
from ..extensions import db
from ..repositories import UserRepository

MAX_NAME_LEN = 50
MAX_URL_LEN = 1024


class ProfileService:
    def __init__(self, users=None):
        self.users = users or UserRepository()

    def update_profile(self, user, display_name=None, avatar_url=None):
        """Patch semantics: only provided (non-None) fields change."""
        if display_name is not None:
            name = display_name.strip()
            if not (1 <= len(name) <= MAX_NAME_LEN):
                raise BadRequest("invalid_display_name")
            user.display_name = name

        if avatar_url is not None:
            url = avatar_url.strip()
            if url:  # empty string clears it
                if not url.startswith(("http://", "https://")) or len(url) > MAX_URL_LEN:
                    raise BadRequest("invalid_avatar_url")
                user.avatar_url = url
            else:
                user.avatar_url = None

        db.session.commit()
        return user.to_base_dict()
