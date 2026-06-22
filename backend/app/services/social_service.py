"""Likes, follows, and profiles."""
from ..errors import BadRequest, NotFound
from ..extensions import db
from ..repositories import (
    CommentRepository,
    FeedRepository,
    FollowRepository,
    LikeRepository,
    ShareRepository,
    UserRepository,
)
from .notification_service import NotificationService


class SocialService:
    def __init__(
        self,
        users=None,
        feeds=None,
        likes=None,
        follows=None,
        comments=None,
        shares=None,
        notifications=None,
    ):
        self.users = users or UserRepository()
        self.feeds = feeds or FeedRepository()
        self.likes = likes or LikeRepository()
        self.follows = follows or FollowRepository()
        self.comments = comments or CommentRepository()
        self.shares = shares or ShareRepository()
        self.notifications = notifications or NotificationService()

    # ---- item serialization with viewer context ----
    def serialize_item(self, item, viewer=None):
        data = item.to_base_dict()
        data["like_count"] = self.likes.count_for_item(item.id)
        data["comment_count"] = self.comments.count_for_item(item.id)
        data["share_count"] = self.shares.count_for_item(item.id)
        if viewer is not None:
            data["liked"] = self.likes.get(viewer.id, item.id) is not None
            data["shared"] = self.shares.get(viewer.id, item.id) is not None
        return data

    def serialize_user(self, user, viewer=None):
        data = user.to_base_dict()
        if viewer is not None:
            data["is_following"] = (
                self.follows.get(viewer.id, user.id) is not None
            )
        return data

    # ---- likes ----
    def like(self, viewer, item_id):
        item = self.feeds.get(item_id)
        if item is None:
            raise NotFound("item_not_found")
        if self.likes.get(viewer.id, item_id) is None:
            self.likes.add(viewer.id, item_id)
            db.session.commit()
        return self.serialize_item(item, viewer)

    def unlike(self, viewer, item_id):
        existing = self.likes.get(viewer.id, item_id)
        if existing:
            self.likes.delete(existing)
            db.session.commit()
        item = self.feeds.get(item_id)
        if item is None:
            raise NotFound("item_not_found")
        return self.serialize_item(item, viewer)

    # ---- follows ----
    def follow(self, viewer, target_id):
        if target_id == viewer.id:
            raise BadRequest("cannot_follow_self")
        target = self.users.get(target_id)
        if target is None:
            raise NotFound("user_not_found")
        if self.follows.get(viewer.id, target_id) is None:
            self.follows.add(viewer.id, target_id)
            self.notifications.notify_follow(viewer, target_id)
            db.session.commit()
        return self.serialize_user(target, viewer)

    def unfollow(self, viewer, target_id):
        existing = self.follows.get(viewer.id, target_id)
        if existing:
            self.follows.delete(existing)
            db.session.commit()
        target = self.users.get(target_id)
        if target is None:
            raise NotFound("user_not_found")
        return self.serialize_user(target, viewer)

    # ---- profiles / directory ----
    def profile(self, user_id, viewer=None):
        user = self.users.get(user_id)
        if user is None:
            raise NotFound("user_not_found")
        likes = self.feeds.liked_by_user(user_id)
        # Flat profile shape the UI consumes: identity + counts + liked items.
        data = self.serialize_user(user, viewer)
        data["username"] = user.username
        data["like_count"] = self.likes.count_for_user(user_id)
        data["follower_count"] = self.follows.follower_count(user_id)
        data["following_count"] = self.follows.following_count(user_id)
        data["likes"] = [self.serialize_item(it, viewer) for it in likes]
        return data

    def directory(self, viewer=None):
        exclude = viewer.id if viewer else None
        users = self.users.directory(exclude_id=exclude)
        return {"users": [self.serialize_user(u, viewer) for u in users]}

    def followers(self, user_id, viewer=None):
        if self.users.get(user_id) is None:
            raise NotFound("user_not_found")
        users = self.follows.followers(user_id)
        return {"users": [self.serialize_user(u, viewer) for u in users]}

    def following(self, user_id, viewer=None):
        if self.users.get(user_id) is None:
            raise NotFound("user_not_found")
        users = self.follows.following(user_id)
        return {"users": [self.serialize_user(u, viewer) for u in users]}
