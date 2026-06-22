"""Rate limiting is isolated here: enabled only for this app, with the shared store reset."""
from app import create_app
from app.extensions import limiter
from app.routes.auth_routes import SIGNUP_LIMIT
from tests.conftest import TestConfig


class RateLimitedConfig(TestConfig):
    RATELIMIT_ENABLED = True


def test_signup_is_rate_limited():
    app = create_app(RateLimitedConfig)
    # SIGNUP_LIMIT is "N per minute"; derive N so the test tracks the route config.
    cap = int(SIGNUP_LIMIT.split()[0])

    with app.app_context():
        limiter.reset()  # clear the process-shared in-memory store for determinism

    client = app.test_client()
    statuses = [
        client.post(
            "/auth/signup",
            json={"username": f"u{i}", "display_name": "U", "password": "hunter2"},
        ).status_code
        for i in range(cap + 1)
    ]

    assert statuses[:cap] == [200] * cap  # first N allowed
    assert statuses[cap] == 429           # N+1 blocked
    assert client.post(
        "/auth/signup", json={"username": "z", "display_name": "Z", "password": "hunter2"}
    ).get_json()["error"] == "rate_limited"

    with app.app_context():
        limiter.reset()
        from app.extensions import db
        db.session.remove()
        db.drop_all()
