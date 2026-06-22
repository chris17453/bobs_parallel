"""Lock the flat /api/users/<id> profile shape the UI consumes (regression for blank profile)."""


def test_profile_is_flat_with_counts(client, seeded):
    client.post("/auth/dev-login")
    client.post("/api/users/u-nova/follow")

    data = client.get("/api/users/u-nova").get_json()
    # Flat identity at the top level (not nested under "user").
    assert data["id"] == "u-nova"
    assert "display_name" in data and isinstance(data["display_name"], str)
    assert "user" not in data
    # Counts the profile header renders.
    for key in ("like_count", "follower_count", "following_count"):
        assert isinstance(data[key], int)
    assert "username" in data            # may be None for seed users, but must be present
    assert isinstance(data["likes"], list)
    assert data["is_following"] is True  # viewer follows u-nova
    assert data["follower_count"] >= 1


def test_demo_users_have_a_real_social_graph(client, seeded):
    """Every demo user should be navigable with real followers/following (no dangling)."""
    for uid in ("u-nova", "u-lux", "u-echo"):
        d = client.get(f"/api/users/{uid}").get_json()
        assert d["id"] == uid
        assert d["following_count"] >= 1  # demo graph wires inter-follows
