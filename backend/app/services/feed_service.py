"""Feed business logic: the main feed and the following feed, cursor-paginated."""
from ..repositories import (
    CommentRepository,
    FeedRepository,
    FollowRepository,
    LikeRepository,
    ShareRepository,
)

DEFAULT_LIMIT = 10
MAX_LIMIT = 30


def clamp_limit(value):
    try:
        return max(1, min(MAX_LIMIT, int(value)))
    except (TypeError, ValueError):
        return DEFAULT_LIMIT


class FeedService:
    def __init__(self, feeds=None, likes=None, follows=None, comments=None, shares=None):
        self.feeds = feeds or FeedRepository()
        self.likes = likes or LikeRepository()
        self.follows = follows or FollowRepository()
        self.comments = comments or CommentRepository()
        self.shares = shares or ShareRepository()

    def _serialize_page(self, rows, limit, viewer):
        has_more = len(rows) > limit
        rows = rows[:limit]
        ids = [r.id for r in rows]
        # Batch all counts into 3 grouped queries instead of 3 per item (no N+1).
        like_counts = self.likes.counts_for_items(ids)
        comment_counts = self.comments.counts_for_items(ids)
        share_counts = self.shares.counts_for_items(ids)
        liked_ids = self.likes.liked_item_ids(viewer.id, ids) if viewer else set()
        shared_ids = self.shares.shared_item_ids(viewer.id, ids) if viewer else set()
        items = []
        for r in rows:
            data = r.to_base_dict()
            data["like_count"] = like_counts.get(r.id, 0)
            data["comment_count"] = comment_counts.get(r.id, 0)
            data["share_count"] = share_counts.get(r.id, 0)
            if viewer is not None:
                data["liked"] = r.id in liked_ids
                data["shared"] = r.id in shared_ids
            items.append(data)
        next_cursor = rows[-1].id if (rows and has_more) else None
        return {"items": items, "next_cursor": next_cursor, "has_more": has_more}

    def main_feed(self, viewer=None, cursor=None, limit=DEFAULT_LIMIT):
        limit = clamp_limit(limit)
        rows = self.feeds.page(cursor=cursor, limit=limit)
        return self._serialize_page(rows, limit, viewer)

    def following_feed(self, viewer, cursor=None, limit=DEFAULT_LIMIT):
        limit = clamp_limit(limit)
        followed = self.follows.followed_ids(viewer.id)
        if not followed:
            return {"items": [], "next_cursor": None, "has_more": False}
        rows = self.feeds.page_liked_by(followed, cursor=cursor, limit=limit)
        return self._serialize_page(rows, limit, viewer)
