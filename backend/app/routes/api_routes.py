"""Thin HTTP layer for content/social. Parse → call one service method → jsonify."""
import requests
from flask import Blueprint, Response, jsonify, request, session, stream_with_context

from ..errors import Unauthorized
from ..extensions import db
from ..models import User
from ..services.audio_service import validated_src
from ..services import (
    EngagementService,
    FeedService,
    NotificationService,
    ProfileService,
    SearchService,
    SocialService,
)

bp = Blueprint("api", __name__, url_prefix="/api")

feeds = FeedService()
social = SocialService()
search_svc = SearchService()
engagement = EngagementService()
notifications = NotificationService()
profiles = ProfileService()


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


@bp.patch("/me")
def update_me():
    body = request.get_json(silent=True) or {}
    updated = profiles.update_profile(
        require_user(),
        display_name=body.get("display_name"),
        avatar_url=body.get("avatar_url"),
    )
    return jsonify({"user": updated})


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


@bp.get("/items/<int:item_id>/comments")
def list_comments(item_id):
    return jsonify(engagement.list_comments(item_id))


@bp.post("/items/<int:item_id>/comments")
def add_comment(item_id):
    body = (request.get_json(silent=True) or {}).get("body")
    return jsonify(engagement.add_comment(require_user(), item_id, body))


@bp.delete("/comments/<int:comment_id>")
def delete_comment(comment_id):
    return jsonify(engagement.delete_comment(require_user(), comment_id))


@bp.post("/items/<int:item_id>/share")
def share(item_id):
    return jsonify(engagement.share(require_user(), item_id))


@bp.get("/notifications")
def list_notifications():
    return jsonify(notifications.list(require_user()))


@bp.get("/notifications/unread-count")
def unread_count():
    return jsonify(notifications.unread_count(require_user()))


@bp.post("/notifications/read")
def mark_notifications_read():
    return jsonify(notifications.mark_all_read(require_user()))


@bp.get("/audio")
def audio_proxy():
    """Stream an allowlisted 30s preview through our origin (CORS-clean, supports Range)."""
    src = validated_src(request.args.get("src"))
    fwd = {}
    if request.headers.get("Range"):
        fwd["Range"] = request.headers["Range"]
    upstream = requests.get(src, stream=True, timeout=15, headers=fwd)

    passthrough = {"content-type", "content-length", "accept-ranges", "content-range"}
    headers = {k: v for k, v in upstream.headers.items() if k.lower() in passthrough}
    headers.setdefault("Accept-Ranges", "bytes")
    headers["Cache-Control"] = "public, max-age=3600"

    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=8192):
                yield chunk
        finally:
            upstream.close()

    return Response(
        stream_with_context(generate()),
        status=upstream.status_code,
        headers=headers,
        content_type=upstream.headers.get("Content-Type", "audio/mpeg"),
    )


@bp.get("/search")
def search():
    return jsonify(search_svc.search(request.args.get("q"), viewer=current_user()))


@bp.get("/users")
def users():
    return jsonify(social.directory(viewer=current_user()))


@bp.get("/users/suggestions")
def user_suggestions():
    return jsonify(social.suggestions(require_user()))


@bp.get("/users/<user_id>")
def user_profile(user_id):
    return jsonify(social.profile(user_id, viewer=current_user()))


@bp.get("/users/<user_id>/followers")
def user_followers(user_id):
    return jsonify(social.followers(user_id, viewer=current_user()))


@bp.get("/users/<user_id>/following")
def user_following(user_id):
    return jsonify(social.following(user_id, viewer=current_user()))


@bp.post("/users/<user_id>/follow")
def follow(user_id):
    return jsonify(social.follow(require_user(), user_id))


@bp.delete("/users/<user_id>/follow")
def unfollow(user_id):
    return jsonify(social.unfollow(require_user(), user_id))
