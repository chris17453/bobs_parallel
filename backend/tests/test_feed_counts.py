"""Lock the batched feed counts: engaged item shows real counts, untouched items show zero.

Uses its own clean items (no demo likes) so counts are deterministic.
"""
from app.extensions import db
from app.models import FeedItem


def _make_items(n=3):
    items = [
        FeedItem(spotify_id=f"t-{i}", kind="track", title=f"Song {i}", subtitle="Artist")
        for i in range(n)
    ]
    db.session.add_all(items)
    db.session.commit()
    return [it.id for it in items]


def test_feed_counts_are_accurate_and_batched(client, db):
    ids = _make_items(3)
    client.post("/auth/dev-login")
    target = ids[0]

    client.post(f"/api/items/{target}/like")
    client.post(f"/api/items/{target}/comments", json={"body": "hi"})
    client.post(f"/api/items/{target}/share")

    items = {i["id"]: i for i in client.get("/api/feed?limit=10").get_json()["items"]}
    hot = items[target]
    assert (hot["like_count"], hot["comment_count"], hot["share_count"]) == (1, 1, 1)
    assert hot["liked"] is True and hot["shared"] is True

    # An untouched item reads zero (grouped query omits it -> default 0).
    cold = items[ids[1]]
    assert (cold["like_count"], cold["comment_count"], cold["share_count"]) == (0, 0, 0)
    assert cold["liked"] is False and cold["shared"] is False
