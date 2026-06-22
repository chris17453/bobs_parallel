"""Profile editing via PATCH /api/me."""


def test_update_display_name_and_avatar(client):
    client.post("/auth/dev-login")
    resp = client.patch(
        "/api/me",
        json={"display_name": "DJ Parallel", "avatar_url": "https://example.com/a.png"},
    )
    assert resp.status_code == 200
    user = resp.get_json()["user"]
    assert user["display_name"] == "DJ Parallel"
    assert user["avatar_url"] == "https://example.com/a.png"
    # Persisted: /api/me reflects it.
    assert client.get("/api/me").get_json()["user"]["display_name"] == "DJ Parallel"


def test_partial_update_leaves_other_fields(client):
    client.post("/auth/dev-login")
    client.patch("/api/me", json={"display_name": "Keep Avatar"})
    user = client.get("/api/me").get_json()["user"]
    assert user["display_name"] == "Keep Avatar"
    assert user["avatar_url"] == "https://picsum.photos/seed/dev-you/200/200"  # unchanged


def test_blank_avatar_clears_it(client):
    client.post("/auth/dev-login")
    client.patch("/api/me", json={"avatar_url": ""})
    assert client.get("/api/me").get_json()["user"]["avatar_url"] is None


def test_invalid_display_name_rejected(client):
    client.post("/auth/dev-login")
    assert client.patch("/api/me", json={"display_name": "   "}).status_code == 400
    assert client.patch("/api/me", json={"display_name": "x" * 51}).status_code == 400


def test_invalid_avatar_url_rejected(client):
    client.post("/auth/dev-login")
    resp = client.patch("/api/me", json={"avatar_url": "javascript:alert(1)"})
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "invalid_avatar_url"


def test_update_requires_auth(client):
    assert client.patch("/api/me", json={"display_name": "Nope"}).status_code == 401
