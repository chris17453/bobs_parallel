"""RealSpotifyClient field mapping — no network (spotipy client constructs lazily/offline)."""
from app.spotify_client import MockSpotifyClient, RealSpotifyClient, get_client


def _client():
    # SpotifyClientCredentials does no network until an API call, so this is offline-safe.
    return RealSpotifyClient("dummy-id", "dummy-secret")


def test_normalize_track_maps_fields_and_preview():
    c = _client()
    raw = {
        "id": "t1",
        "name": "Song",
        "artists": [{"name": "A"}, {"name": "B"}],
        "album": {"images": [{"url": "img"}]},
        "preview_url": "https://p.scdn.co/mp3-preview/x",
        "external_urls": {"spotify": "https://open.spotify.com/track/t1"},
        "popularity": 73,
    }
    out = c._normalize_track(raw)
    assert out == {
        "spotify_id": "t1",
        "kind": "track",
        "title": "Song",
        "subtitle": "A, B",
        "image_url": "img",
        "preview_url": "https://p.scdn.co/mp3-preview/x",
        "spotify_url": "https://open.spotify.com/track/t1",
        "popularity": 73,
    }


def test_normalize_track_tolerates_null_preview():
    # Post-2024-11-27 SimpleTrack responses have no preview_url.
    out = _client()._normalize_track({"id": "t", "name": "n", "artists": []})
    assert out["preview_url"] is None
    assert out["image_url"] is None  # missing album images degrade to None, no crash


def test_normalize_album_and_artist():
    c = _client()
    album = c._normalize_album(
        {"id": "a1", "name": "LP", "artists": [{"name": "X"}], "images": [{"url": "ai"}]}
    )
    assert album["kind"] == "album" and album["preview_url"] is None and album["image_url"] == "ai"
    artist = c._normalize_artist({"id": "ar1", "name": "Y", "images": []})
    assert artist["kind"] == "artist" and artist["subtitle"] == "Artist"


def test_get_client_switches_on_creds(app):
    with app.app_context():
        assert isinstance(get_client(app), MockSpotifyClient)  # test config has no creds
    app.config["SPOTIFY_CLIENT_ID"] = "x"
    app.config["SPOTIFY_CLIENT_SECRET"] = "y"
    with app.app_context():
        assert isinstance(get_client(app), RealSpotifyClient)
