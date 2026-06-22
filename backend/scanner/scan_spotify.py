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
from app.models import (  # noqa: E402
    Comment,
    FeedItem,
    Follow,
    Like,
    Notification,
    User,
)
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
    ("u-dex", "Dex"), ("u-juno", "Juno"), ("u-lux", "Lux"),
    ("u-rio", "Rio"), ("u-sky", "Sky"), ("u-vee", "Vee"),
    ("u-zane", "Zane"), ("u-indie", "Indie"), ("u-echo", "Echo"),
]

DEMO_COMMENTS = [
    "this goes hard", "on repeat all week", "who produced this??",
    "needed this today", "instant add to the playlist", "those drums tho",
    "sounds like a sunset", "criminally underrated", "vibe immaculate",
    "found my new favorite", "the bassline 🔥", "perfect late-night track",
]


def _ensure_follow(follower_id, followed_id, notify=False):
    if follower_id == followed_id:
        return
    if not Follow.query.filter_by(follower_id=follower_id, followed_id=followed_id).first():
        db.session.add(Follow(follower_id=follower_id, followed_id=followed_id))
        if notify and not Notification.query.filter_by(
            user_id=followed_id, actor_id=follower_id, kind="follow"
        ).first():
            db.session.add(
                Notification(user_id=followed_id, actor_id=follower_id, kind="follow")
            )


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

    ids = [uid for uid, _ in DEMO_USERS]

    # Each demo user likes a handful of items...
    for uid in ids:
        for it in rng.sample(items, min(12, len(items))):
            if not Like.query.filter_by(user_id=uid, item_id=it.id).first():
                db.session.add(Like(user_id=uid, item_id=it.id))
    # ...comments on a few...
    for uid in ids:
        for it in rng.sample(items, min(3, len(items))):
            db.session.add(
                Comment(user_id=uid, item_id=it.id, body=rng.choice(DEMO_COMMENTS))
            )
    db.session.commit()

    # ...and a dense follow graph AMONG the demo users so every profile is navigable
    # (real followers/following, nothing dangling).
    for uid in ids:
        others = [o for o in ids if o != uid]
        for target in rng.sample(others, rng.randint(3, 6)):
            _ensure_follow(uid, target)
    db.session.commit()

    # Wire the graph around the dev user too, with notifications so the bell isn't empty.
    if db.session.get(User, "dev-you") is not None:
        for uid in ("u-nova", "u-mira", "u-lux"):
            _ensure_follow("dev-you", uid)
        for uid in ("u-kaz", "u-juno", "u-rio", "u-sky"):
            _ensure_follow(uid, "dev-you", notify=True)
        db.session.commit()

    print(
        f"[seed] {len(DEMO_USERS)} demo users with likes, comments, "
        f"follow graph + notifications ready"
    )


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
