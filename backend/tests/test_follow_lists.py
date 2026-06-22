"""Followers/following list endpoints."""


def test_followers_and_following_lists(client, seeded):
    client.post("/auth/dev-login")
    client.post("/api/users/u-nova/follow")

    # dev-you now appears in u-nova's followers.
    followers = client.get("/api/users/u-nova/followers").get_json()["users"]
    assert any(u["id"] == "dev-you" for u in followers)

    # u-nova's following list is real (demo graph wires inter-follows).
    following = client.get("/api/users/u-nova/following").get_json()
    assert isinstance(following["users"], list)
    assert len(following["users"]) >= 1


def test_list_includes_is_following_for_viewer(client, seeded):
    client.post("/auth/dev-login")
    # Whoever u-nova follows — viewer (dev-you) gets an is_following flag on each.
    users = client.get("/api/users/u-nova/following").get_json()["users"]
    assert all("is_following" in u for u in users)


def test_lists_404_for_missing_user(client):
    assert client.get("/api/users/u-ghost/followers").status_code == 404
    assert client.get("/api/users/u-ghost/following").status_code == 404
