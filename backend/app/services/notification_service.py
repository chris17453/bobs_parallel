"""Activity notifications (e.g. new followers)."""
from ..extensions import db
from ..models import Notification
from ..repositories import NotificationRepository


class NotificationService:
    def __init__(self, notifications=None):
        self.notifications = notifications or NotificationRepository()

    # ---- creation (called by other services) ----
    def notify_follow(self, actor, recipient_id):
        """Record that `actor` followed `recipient_id`. No-op for self-follow."""
        if actor.id == recipient_id:
            return None
        note = Notification(user_id=recipient_id, actor_id=actor.id, kind="follow")
        self.notifications.add(note)
        # Caller owns the surrounding transaction commit; flush so the row exists.
        db.session.flush()
        return note

    # ---- reads ----
    @staticmethod
    def _serialize(note, actor):
        return {
            "id": note.id,
            "kind": note.kind,
            "read": note.read,
            "created_at": note.created_at.isoformat() if note.created_at else None,
            "actor": {
                "id": actor.id,
                "display_name": actor.display_name,
                "avatar_url": actor.avatar_url,
            },
        }

    def list(self, user, limit=50):
        rows = self.notifications.recent(user.id, limit=limit)
        return {
            "notifications": [self._serialize(n, a) for n, a in rows],
            "unread_count": self.notifications.unread_count(user.id),
        }

    def unread_count(self, user):
        return {"unread_count": self.notifications.unread_count(user.id)}

    def mark_all_read(self, user):
        self.notifications.mark_all_read(user.id)
        db.session.commit()
        return {"ok": True, "unread_count": 0}
