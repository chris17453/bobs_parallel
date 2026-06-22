"""Search across cached content and people."""
from ..repositories import FeedRepository, UserRepository
from .social_service import SocialService


class SearchService:
    def __init__(self, feeds=None, users=None, social=None):
        self.feeds = feeds or FeedRepository()
        self.users = users or UserRepository()
        self.social = social or SocialService()

    def search(self, query, viewer=None):
        query = (query or "").strip()
        if not query:
            return {"items": [], "users": []}
        like = f"%{query}%"
        items = self.feeds.search(like)
        users = self.users.search_by_name(like)
        return {
            "items": [self.social.serialize_item(it, viewer) for it in items],
            "users": [self.social.serialize_user(u, viewer) for u in users],
        }
