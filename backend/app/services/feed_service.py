"""Feed business logic: the main feed and the following feed, cursor-paginated."""
from ..repositories import FeedRepository, FollowRepository, LikeRepository

DEFAULT_LIMIT = 10
MAX_LIMIT = 30


def clamp_limit(value):
    try:
        return max(1, min(MAX_LIMIT, int(value)))
    except (TypeError, ValueError):
        return DEFAULT_LIMIT


class FeedService:
    def __init__(self, feeds=None, likes=None, follows=None):
        self.feeds = feeds or FeedRepository()
        self.likes = likes or LikeRepository()
        self.follows = follows or FollowRepository()

    def _serialize_page(self, rows, limit, viewer):
        has_more = len(rows) > limit
        rows = rows[:limit]
        liked_ids = (
            self.likes.liked_item_ids(viewer.id, [r.id for r in rows]) if viewer else set()
        )
        items = []
        for r in rows:
            data = r.to_base_dict()
            data["like_count"] = self.likes.count_for_item(r.id)
            if viewer is not None:
                data["liked"] = r.id in liked_ids
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
