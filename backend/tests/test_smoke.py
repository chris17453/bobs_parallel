"""Smoke tests over every critical path: health, auth, feed pagination, like, follow, search."""


def test_healthz(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_me_anonymous(client):
    assert client.get("/api/me").get_json()["user"] is None


def test_dev_login_starts_session(client):
    resp = client.post("/auth/dev-login")
    assert resp.status_code == 200
    assert resp.get_json()["user"]["id"] == "dev-you"
    # Session persists across requests on the same client.
    assert client.get("/api/me").get_json()["user"]["id"] == "dev-you"


def test_feed_is_cursor_paginated(client, seeded):
    first = client.get("/api/feed?limit=5").get_json()
    assert len(first["items"]) == 5
    assert first["has_more"] is True
    assert first["next_cursor"] is not None

    second = client.get(f"/api/feed?limit=5&cursor={first['next_cursor']}").get_json()
    first_ids = {i["id"] for i in first["items"]}
    second_ids = {i["id"] for i in second["items"]}
    assert first_ids.isdisjoint(second_ids)  # no overlap across pages


def test_like_toggles_state_and_count(client, seeded):
    client.post("/auth/dev-login")
    item_id = client.get("/api/feed?limit=1").get_json()["items"][0]["id"]

    liked = client.post(f"/api/items/{item_id}/like").get_json()
    assert liked["liked"] is True
    before = liked["like_count"]

    unliked = client.delete(f"/api/items/{item_id}/like").get_json()
    assert unliked["liked"] is False
    assert unliked["like_count"] == before - 1


def test_like_requires_auth(client, seeded):
    item_id = client.get("/api/feed?limit=1").get_json()["items"][0]["id"]
    assert client.post(f"/api/items/{item_id}/like").status_code == 401


def test_follow_builds_following_feed(client, seeded):
    client.post("/auth/dev-login")
    # Demo user u-nova has likes from the seed; following them populates the feed.
    resp = client.post("/api/users/u-nova/follow")
    assert resp.status_code == 200
    assert resp.get_json()["is_following"] is True

    following = client.get("/api/feed/following").get_json()
    assert len(following["items"]) > 0


def test_cannot_follow_self(client):
    client.post("/auth/dev-login")
    resp = client.post("/api/users/dev-you/follow")
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "cannot_follow_self"


def test_search_finds_content(client, seeded):
    # Mock artist "Tame Impala" is deterministic content.
    resp = client.get("/api/search?q=tame").get_json()
    assert any("tame" in (i["title"] + i.get("subtitle", "")).lower() for i in resp["items"])
