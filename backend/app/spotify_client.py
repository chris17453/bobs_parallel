"""Spotify data access with a real client + an offline mock layer.

The rest of the app only talks to `get_client()`, so swapping mock <-> real is a
single env-var flip (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET).
"""
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API = "https://api.spotify.com/v1"


class MockSpotifyClient:
    """Deterministic fake content so the whole app runs with no creds/network."""

    enabled = False

    _ARTISTS = [
        "Tame Impala", "FKA twigs", "Bonobo", "Khruangbin", "Floating Points",
        "Caribou", "Jamie xx", "Four Tet", "Aphex Twin", "Burial",
        "King Krule", "Mac DeMarco", "Men I Trust", "Crumb", "Still Woozy",
        "Toro y Moi", "Glass Animals", "Unknown Mortal Orchestra", "Beach House", "Slowdive",
    ]
    _WORDS = [
        "Neon", "Velvet", "Midnight", "Echo", "Crystal", "Lunar", "Paper", "Static",
        "Golden", "Violet", "Hollow", "Drift", "Saturn", "Mirror", "Ocean", "Ghost",
    ]

    def _img(self, seed):
        # picsum gives stable images per seed; works offline-ish (cached) and in prod.
        return f"https://picsum.photos/seed/{seed}/600/600"

    def _make_item(self, i):
        kind = ("track", "album", "artist")[i % 3]
        artist = self._ARTISTS[i % len(self._ARTISTS)]
        w1 = self._WORDS[i % len(self._WORDS)]
        w2 = self._WORDS[(i * 7 + 3) % len(self._WORDS)]
        spotify_id = f"mock-{kind}-{i}"
        base = {
            "spotify_id": spotify_id,
            "kind": kind,
            "image_url": self._img(spotify_id),
            "spotify_url": f"https://open.spotify.com/{kind}/{spotify_id}",
            "popularity": (i * 17) % 100,
            # SoundHelix offers stable, hotlink-friendly sample mp3s.
            "preview_url": f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{(i % 16) + 1}.mp3",
        }
        if kind == "track":
            base.update(title=f"{w1} {w2}", subtitle=artist)
        elif kind == "album":
            base.update(title=f"{w1} {w2} (LP)", subtitle=artist)
            base["preview_url"] = None
        else:  # artist
            base.update(title=artist, subtitle="Artist")
            base["preview_url"] = None
        return base

    def scan(self, limit=120):
        return [self._make_item(i) for i in range(limit)]

    def search(self, query, limit=20):
        q = query.lower()
        return [it for it in self.scan(200) if q in it["title"].lower()
                or q in (it["subtitle"] or "").lower()][:limit]


class RealSpotifyClient:
    """Real Spotify content via spotipy (client-credentials flow — public data only).

    Heads up (Spotify Web API change, 2024-11-27): `preview_url` is null in multi-get /
    SimpleTrack responses (e.g. album track lists). Full Track objects from **Search** can
    still carry it, so we scan tracks via Search to maximize playable previews. Items without
    a preview are still shown (metadata) but just aren't playable — the UI/player handle that.
    Restricted-for-new-apps endpoints (recommendations, related-artists, audio-features,
    featured/category playlists) are intentionally NOT used. Search + New Releases remain open.
    """

    enabled = True

    def __init__(self, client_id, client_secret):
        # Lazy import so the module (and the mock path) load even without spotipy installed.
        import spotipy
        from spotipy.oauth2 import SpotifyClientCredentials

        self.client_id = client_id
        self.client_secret = client_secret
        self._sp = spotipy.Spotify(
            auth_manager=SpotifyClientCredentials(
                client_id=client_id, client_secret=client_secret
            ),
            requests_timeout=15,
            retries=2,
        )

    def _normalize_track(self, t):
        return {
            "spotify_id": t["id"],
            "kind": "track",
            "title": t["name"],
            "subtitle": ", ".join(a["name"] for a in t.get("artists", [])),
            "image_url": (t.get("album", {}).get("images") or [{}])[0].get("url"),
            "preview_url": t.get("preview_url"),
            "spotify_url": t.get("external_urls", {}).get("spotify"),
            "popularity": t.get("popularity", 0),
        }

    def _normalize_album(self, a):
        return {
            "spotify_id": a["id"],
            "kind": "album",
            "title": a["name"],
            "subtitle": ", ".join(ar["name"] for ar in a.get("artists", [])),
            "image_url": (a.get("images") or [{}])[0].get("url"),
            "preview_url": None,
            "spotify_url": a.get("external_urls", {}).get("spotify"),
            "popularity": a.get("popularity", 0),
        }

    def _normalize_artist(self, ar):
        return {
            "spotify_id": ar["id"],
            "kind": "artist",
            "title": ar["name"],
            "subtitle": "Artist",
            "image_url": (ar.get("images") or [{}])[0].get("url"),
            "preview_url": None,
            "spotify_url": ar.get("external_urls", {}).get("spotify"),
            "popularity": ar.get("popularity", 0),
        }

    def scan(self, limit=120, year=2025):
        items = []
        # New releases -> albums (visual variety; their SimpleTrack lists lack previews).
        rel = self._sp.new_releases(limit=50) or {}
        for a in (rel.get("albums") or {}).get("items", []):
            items.append(self._normalize_album(a))
        # Tracks via Search -> full Track objects (best shot at a playable preview_url).
        res = self._sp.search(q=f"year:{year}", type="track", limit=50) or {}
        for t in (res.get("tracks") or {}).get("items", []):
            items.append(self._normalize_track(t))
        return items[:limit]

    def search(self, query, limit=20):
        data = self._sp.search(q=query, type="track,album,artist", limit=limit) or {}
        out = []
        for t in (data.get("tracks") or {}).get("items", []):
            out.append(self._normalize_track(t))
        for a in (data.get("albums") or {}).get("items", []):
            out.append(self._normalize_album(a))
        for ar in (data.get("artists") or {}).get("items", []):
            out.append(self._normalize_artist(ar))
        return out[:limit]


def get_client(app):
    cid = app.config.get("SPOTIFY_CLIENT_ID")
    secret = app.config.get("SPOTIFY_CLIENT_SECRET")
    if cid and secret:
        return RealSpotifyClient(cid, secret)
    return MockSpotifyClient()
