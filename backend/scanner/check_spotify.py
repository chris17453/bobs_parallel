"""Spotify connectivity check. Run: python -m scanner.check_spotify  (or `make spotify-check`).

Verifies that creds are present and that we can actually reach Spotify (client-credentials
token + a small live scan). Prints a clear pass/fail so going live is a confident env-drop.
Exit code 0 = OK, 1 = problem (so it can gate CI/deploy if desired).
"""
import sys

sys.path.insert(0, ".")

from app import create_app  # noqa: E402
from app.spotify_client import RealSpotifyClient, get_client  # noqa: E402


def main():
    app = create_app()
    client = get_client(app)

    if not isinstance(client, RealSpotifyClient):
        print("✗ No Spotify creds configured — running in MOCK mode.")
        print("  Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env, then re-run.")
        return 1

    print("• Creds present. Requesting a client-credentials token…")
    try:
        token = client._client_token()
        print(f"  ✓ Token acquired ({token[:8]}…).")
    except Exception as e:  # noqa: BLE001 — surface the real reason to the operator
        print(f"  ✗ Token request failed: {e}")
        print("  Check the client id/secret are correct and not rate-limited.")
        return 1

    print("• Performing a small live scan (new releases + tracks)…")
    try:
        items = client.scan(limit=5)
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ Scan failed: {e}")
        return 1

    if not items:
        print("  ✗ Scan returned 0 items — unexpected; check API access/region.")
        return 1

    print(f"  ✓ Got {len(items)} item(s). Sample:")
    for it in items[:3]:
        print(f"    - [{it['kind']}] {it['title']} — {it.get('subtitle') or ''}")
    print("\n✓ Spotify connectivity OK. Run `make scan` (or `make seed`) to populate the feed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
