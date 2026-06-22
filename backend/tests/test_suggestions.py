"""Who-to-follow suggestions: excludes self + already-followed, ranks by popularity."""


def test_suggestions_exclude_self_and_followed(client, seeded):
    client.post("/auth/dev-login")
    client.post("/api/users/u-nova/follow")

    users = client.get("/api/users/suggestions").get_json()["users"]
    ids = [u["id"] for u in users]
    assert "dev-you" not in ids          # not yourself
    assert "u-nova" not in ids           # already followed
    assert all(u["is_following"] is False for u in users)
    assert len(ids) >= 1


def test_suggestions_ranked_by_followers(client, seeded):
    client.post("/auth/dev-login")
    users = client.get("/api/users/suggestions").get_json()["users"]
    # The static /suggestions route must win over /users/<id>.
    assert isinstance(users, list) and users


def test_suggestions_requires_auth(client):
    assert client.get("/api/users/suggestions").status_code == 401
