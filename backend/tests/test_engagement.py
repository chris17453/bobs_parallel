"""Comments + shares: service behavior and API smoke."""
import pytest

from app.errors import Forbidden, NotFound
from app.services.engagement_service import EngagementService


def _first_item_id(client):
    return client.get("/api/feed?limit=1").get_json()["items"][0]["id"]


# ---- API smoke ----
def test_comment_lifecycle(client, seeded):
    client.post("/auth/dev-login")
    item_id = _first_item_id(client)

    added = client.post(f"/api/items/{item_id}/comments", json={"body": "fire track"})
    assert added.status_code == 200
    payload = added.get_json()
    assert payload["comment_count"] == 1
    assert payload["comment"]["author"]["id"] == "dev-you"
    comment_id = payload["comment"]["id"]

    listed = client.get(f"/api/items/{item_id}/comments").get_json()
    assert listed["comment_count"] == 1
    assert listed["comments"][0]["body"] == "fire track"

    deleted = client.delete(f"/api/comments/{comment_id}")
    assert deleted.status_code == 200
    assert deleted.get_json()["comment_count"] == 0


def test_comment_requires_auth(client, seeded):
    item_id = _first_item_id(client)
    assert client.post(f"/api/items/{item_id}/comments", json={"body": "x"}).status_code == 401


def test_empty_comment_rejected(client, seeded):
    client.post("/auth/dev-login")
    item_id = _first_item_id(client)
    resp = client.post(f"/api/items/{item_id}/comments", json={"body": "   "})
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "empty_comment"


def test_share_sets_count_and_flag(client, seeded):
    client.post("/auth/dev-login")
    item_id = _first_item_id(client)
    resp = client.post(f"/api/items/{item_id}/share").get_json()
    assert resp["shared"] is True
    assert resp["share_count"] == 1
    # Sharing again is idempotent (no duplicate count).
    again = client.post(f"/api/items/{item_id}/share").get_json()
    assert again["share_count"] == 1


def test_feed_item_carries_engagement_counts(client, seeded):
    client.post("/auth/dev-login")
    item = client.get("/api/feed?limit=1").get_json()["items"][0]
    for key in ("like_count", "comment_count", "share_count", "liked", "shared"):
        assert key in item


# ---- service-level guards ----
def test_cannot_delete_others_comment(client, seeded, db):
    from app.models import Comment, User

    other = User(id="u-stranger", display_name="Stranger")
    db.session.add(other)
    item_id = _first_item_id(client)
    c = Comment(user_id="u-stranger", item_id=item_id, body="mine")
    db.session.add(c)
    db.session.commit()

    me = User(id="me", display_name="Me")
    db.session.add(me)
    db.session.commit()
    with pytest.raises(Forbidden):
        EngagementService().delete_comment(me, c.id)


def test_comment_on_missing_item(db):
    from app.models import User

    me = User(id="me", display_name="Me")
    db.session.add(me)
    db.session.commit()
    with pytest.raises(NotFound):
        EngagementService().add_comment(me, 999999, "hi")
