"""Comments and shares on feed items."""
from ..errors import BadRequest, Forbidden, NotFound
from ..extensions import db
from ..models import Comment
from ..repositories import CommentRepository, FeedRepository, ShareRepository

MAX_COMMENT_LEN = 2000


class EngagementService:
    def __init__(self, feeds=None, comments=None, shares=None):
        self.feeds = feeds or FeedRepository()
        self.comments = comments or CommentRepository()
        self.shares = shares or ShareRepository()

    # ---- comments ----
    @staticmethod
    def _serialize_comment(comment, author):
        return {
            "id": comment.id,
            "item_id": comment.item_id,
            "body": comment.body,
            "created_at": comment.created_at.isoformat() if comment.created_at else None,
            "author": {
                "id": author.id,
                "display_name": author.display_name,
                "avatar_url": author.avatar_url,
            },
        }

    def list_comments(self, item_id):
        if self.feeds.get(item_id) is None:
            raise NotFound("item_not_found")
        rows = self.comments.for_item(item_id)
        return {
            "comments": [self._serialize_comment(c, u) for c, u in rows],
            "comment_count": len(rows),
        }

    def add_comment(self, viewer, item_id, body):
        body = (body or "").strip()
        if not body:
            raise BadRequest("empty_comment")
        if len(body) > MAX_COMMENT_LEN:
            raise BadRequest("comment_too_long")
        if self.feeds.get(item_id) is None:
            raise NotFound("item_not_found")
        comment = Comment(user_id=viewer.id, item_id=item_id, body=body)
        self.comments.add(comment)
        db.session.commit()
        return {
            "comment": self._serialize_comment(comment, viewer),
            "comment_count": self.comments.count_for_item(item_id),
        }

    def delete_comment(self, viewer, comment_id):
        comment = self.comments.get(comment_id)
        if comment is None:
            raise NotFound("comment_not_found")
        if comment.user_id != viewer.id:
            raise Forbidden("not_your_comment")
        item_id = comment.item_id
        self.comments.delete(comment)
        db.session.commit()
        return {"ok": True, "comment_count": self.comments.count_for_item(item_id)}

    # ---- shares ----
    def share(self, viewer, item_id):
        item = self.feeds.get(item_id)
        if item is None:
            raise NotFound("item_not_found")
        if self.shares.get(viewer.id, item_id) is None:
            self.shares.add(viewer.id, item_id)
            db.session.commit()
        return {
            "item_id": item_id,
            "shared": True,
            "share_count": self.shares.count_for_item(item_id),
        }
