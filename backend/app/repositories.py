"""Repositories own all DB queries. Services compose these; routes never touch them.

Each repository wraps the SQLAlchemy session for one aggregate. Trivial `session.get`
by PK is allowed inline in services, but anything with a filter lives here.
"""
from .extensions import db
from .models import FeedItem, Follow, Like, PasswordReset, User


class UserRepository:
    def get(self, user_id):
        return db.session.get(User, user_id)

    def get_by_username(self, username):
        return User.query.filter_by(username=username).first()

    def add(self, user):
        db.session.add(user)

    def search_by_name(self, like, limit=15):
        return User.query.filter(User.display_name.ilike(like)).limit(limit).all()

    def directory(self, exclude_id=None, limit=50):
        q = User.query
        if exclude_id:
            q = q.filter(User.id != exclude_id)
        return q.order_by(User.created_at.desc()).limit(limit).all()


class FeedRepository:
    def get(self, item_id):
        return db.session.get(FeedItem, item_id)

    def get_by_spotify_id(self, spotify_id):
        return FeedItem.query.filter_by(spotify_id=spotify_id).first()

    def add(self, item):
        db.session.add(item)

    def page(self, cursor=None, limit=10):
        """One page of the main feed, descending id. Returns up to limit+1 to detect more."""
        q = FeedItem.query
        if cursor:
            q = q.filter(FeedItem.id < cursor)
        return q.order_by(FeedItem.id.desc()).limit(limit + 1).all()

    def page_liked_by(self, user_ids, cursor=None, limit=10):
        q = (
            db.session.query(FeedItem)
            .join(Like, Like.item_id == FeedItem.id)
            .filter(Like.user_id.in_(user_ids))
        )
        if cursor:
            q = q.filter(FeedItem.id < cursor)
        return q.order_by(FeedItem.id.desc()).distinct().limit(limit + 1).all()

    def search(self, like, limit=30):
        return (
            FeedItem.query.filter(
                db.or_(FeedItem.title.ilike(like), FeedItem.subtitle.ilike(like))
            )
            .order_by(FeedItem.popularity.desc())
            .limit(limit)
            .all()
        )

    def liked_by_user(self, user_id, limit=60):
        return (
            db.session.query(FeedItem)
            .join(Like, Like.item_id == FeedItem.id)
            .filter(Like.user_id == user_id)
            .order_by(FeedItem.id.desc())
            .limit(limit)
            .all()
        )

    def count(self):
        return FeedItem.query.count()

    def all(self):
        return FeedItem.query.all()


class LikeRepository:
    def get(self, user_id, item_id):
        return Like.query.filter_by(user_id=user_id, item_id=item_id).first()

    def add(self, user_id, item_id):
        db.session.add(Like(user_id=user_id, item_id=item_id))

    def delete(self, like):
        db.session.delete(like)

    def count_for_item(self, item_id):
        return Like.query.filter_by(item_id=item_id).count()

    def liked_item_ids(self, user_id, item_ids):
        if not item_ids:
            return set()
        rows = Like.query.filter(
            Like.user_id == user_id, Like.item_id.in_(item_ids)
        ).all()
        return {r.item_id for r in rows}


class FollowRepository:
    def get(self, follower_id, followed_id):
        return Follow.query.filter_by(
            follower_id=follower_id, followed_id=followed_id
        ).first()

    def add(self, follower_id, followed_id):
        db.session.add(Follow(follower_id=follower_id, followed_id=followed_id))

    def delete(self, follow):
        db.session.delete(follow)

    def followed_ids(self, follower_id):
        return [
            f.followed_id for f in Follow.query.filter_by(follower_id=follower_id).all()
        ]

    def follower_count(self, user_id):
        return Follow.query.filter_by(followed_id=user_id).count()

    def following_count(self, user_id):
        return Follow.query.filter_by(follower_id=user_id).count()


class PasswordResetRepository:
    def get(self, token):
        return db.session.get(PasswordReset, token)

    def add(self, reset):
        db.session.add(reset)
