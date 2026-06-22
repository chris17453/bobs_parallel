"""Spotify scanner / seeder.

Run modes (see `make seed` / `make scan`):
  python -m scanner.scan_spotify           # scan content into feed_items (mock or real)
  python -m scanner.scan_spotify --demo     # also create demo users + follows + likes

Idempotent: feed items are upserted by spotify_id.
"""
import argparse
import random
import sys

# Allow `python -m scanner.scan_spotify` from the backend/ dir.
sys.path.insert(0, ".")

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import FeedItem, Follow, Like, User  # noqa: E402
from app.spotify_client import get_client  # noqa: E402


def scan(app, limit=120):
    client = get_client(app)
    raw = client.scan(limit=limit)
    created, updated = 0, 0
    for r in raw:
        item = FeedItem.query.filter_by(spotify_id=r["spotify_id"]).first()
        if item is None:
            item = FeedItem(spotify_id=r["spotify_id"])
            db.session.add(item)
            created += 1
        else:
            updated += 1
        item.kind = r["kind"]
        item.title = r["title"]
        item.subtitle = r.get("subtitle")
        item.image_url = r.get("image_url")
        item.preview_url = r.get("preview_url")
        item.spotify_url = r.get("spotify_url")
        item.popularity = r.get("popularity", 0)
    db.session.commit()
    mode = "real Spotify" if client.enabled else "mock"
    print(f"[scan:{mode}] {created} created, {updated} updated "
          f"({FeedItem.query.count()} total items)")


DEMO_USERS = [
    ("u-nova", "Nova"), ("u-kaz", "Kaz"), ("u-mira", "Mira"),
    ("u-dex", "Dex"), ("u-juno", "Juno"),
]


def seed_demo(app):
    rng = random.Random(42)  # deterministic demo graph
    for uid, name in DEMO_USERS:
        if db.session.get(User, uid) is None:
            db.session.add(User(
                id=uid, display_name=name, is_seed=True,
                avatar_url=f"https://picsum.photos/seed/{uid}/200/200",
            ))
    db.session.commit()

    items = FeedItem.query.all()
    if not items:
        print("[seed] no feed items yet; run scan first")
        return

    # Each demo user likes a handful of items.
    for uid, _ in DEMO_USERS:
        for it in rng.sample(items, min(12, len(items))):
            if not Like.query.filter_by(user_id=uid, item_id=it.id).first():
                db.session.add(Like(user_id=uid, item_id=it.id))
    db.session.commit()

    # If the dev user exists, follow a couple of demo users so the Following feed is populated.
    if db.session.get(User, "dev-you") is not None:
        for uid in ("u-nova", "u-mira"):
            if not Follow.query.filter_by(follower_id="dev-you", followed_id=uid).first():
                db.session.add(Follow(follower_id="dev-you", followed_id=uid))
        db.session.commit()

    print(f"[seed] {len(DEMO_USERS)} demo users with likes ready")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=120)
    parser.add_argument("--demo", action="store_true", help="also seed demo users/likes")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        scan(app, limit=args.limit)
        if args.demo:
            seed_demo(app)


if __name__ == "__main__":
    main()
