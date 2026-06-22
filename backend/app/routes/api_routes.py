"""Thin HTTP layer for content/social. Parse → call one service method → jsonify."""
from flask import Blueprint, jsonify, request, session

from ..errors import Unauthorized
from ..extensions import db
from ..models import User
from ..services import FeedService, SearchService, SocialService

bp = Blueprint("api", __name__, url_prefix="/api")

feeds = FeedService()
social = SocialService()
search_svc = SearchService()


def current_user():
    uid = session.get("user_id")
    return db.session.get(User, uid) if uid else None


def require_user():
    user = current_user()
    if user is None:
        raise Unauthorized()
    return user


@bp.get("/me")
def me():
    user = current_user()
    return jsonify({"user": user.to_base_dict() if user else None})


@bp.get("/feed")
def feed():
    return jsonify(
        feeds.main_feed(
            viewer=current_user(),
            cursor=request.args.get("cursor", type=int),
            limit=request.args.get("limit", 10),
        )
    )


@bp.get("/feed/following")
def following_feed():
    return jsonify(
        feeds.following_feed(
            viewer=require_user(),
            cursor=request.args.get("cursor", type=int),
            limit=request.args.get("limit", 10),
        )
    )


@bp.post("/items/<int:item_id>/like")
def like(item_id):
    return jsonify(social.like(require_user(), item_id))


@bp.delete("/items/<int:item_id>/like")
def unlike(item_id):
    return jsonify(social.unlike(require_user(), item_id))


@bp.get("/search")
def search():
    return jsonify(search_svc.search(request.args.get("q"), viewer=current_user()))


@bp.get("/users")
def users():
    return jsonify(social.directory(viewer=current_user()))


@bp.get("/users/<user_id>")
def user_profile(user_id):
    return jsonify(social.profile(user_id, viewer=current_user()))


@bp.post("/users/<user_id>/follow")
def follow(user_id):
    return jsonify(social.follow(require_user(), user_id))


@bp.delete("/users/<user_id>/follow")
def unfollow(user_id):
    return jsonify(social.unfollow(require_user(), user_id))
