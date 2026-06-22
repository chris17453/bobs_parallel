"""Spotify data access with a real client + an offline mock layer.

The rest of the app only talks to `get_client()`, so swapping mock <-> real is a
single env-var flip (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET).
"""
import base64
import hashlib
import time

import requests

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
    enabled = True

    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self._app_token = None
        self._app_token_exp = 0

    # ---- App (client-credentials) token for content scanning/search ----
    def _client_token(self):
        if self._app_token and time.time() < self._app_token_exp - 30:
            return self._app_token
        auth = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        resp = requests.post(
            SPOTIFY_TOKEN_URL,
            data={"grant_type": "client_credentials"},
            headers={"Authorization": f"Basic {auth}"},
            timeout=15,
        )
        resp.raise_for_status()
        payload = resp.json()
        self._app_token = payload["access_token"]
        self._app_token_exp = time.time() + payload.get("expires_in", 3600)
        return self._app_token

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

    def scan(self, limit=120):
        token = self._client_token()
        headers = {"Authorization": f"Bearer {token}"}
        items = []
        # New releases -> albums + their artists.
        r = requests.get(
            f"{SPOTIFY_API}/browse/new-releases",
            headers=headers, params={"limit": 50}, timeout=15,
        )
        r.raise_for_status()
        for a in r.json().get("albums", {}).get("items", []):
            items.append(self._normalize_album(a))
        # A few featured-playlist tracks for the track/preview cards.
        r = requests.get(
            f"{SPOTIFY_API}/search",
            headers=headers,
            params={"q": "year:2024", "type": "track", "limit": 50},
            timeout=15,
        )
        if r.ok:
            for t in r.json().get("tracks", {}).get("items", []):
                items.append(self._normalize_track(t))
        return items[:limit]

    def search(self, query, limit=20):
        token = self._client_token()
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(
            f"{SPOTIFY_API}/search",
            headers=headers,
            params={"q": query, "type": "track,album,artist", "limit": limit},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        out = []
        for t in data.get("tracks", {}).get("items", []):
            out.append(self._normalize_track(t))
        for a in data.get("albums", {}).get("items", []):
            out.append(self._normalize_album(a))
        for ar in data.get("artists", {}).get("items", []):
            out.append(self._normalize_artist(ar))
        return out[:limit]


def get_client(app):
    cid = app.config.get("SPOTIFY_CLIENT_ID")
    secret = app.config.get("SPOTIFY_CLIENT_SECRET")
    if cid and secret:
        return RealSpotifyClient(cid, secret)
    return MockSpotifyClient()
