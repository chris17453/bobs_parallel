"""Unit tests for AuthService: local accounts + QR reset, with an injected clock."""
from datetime import datetime, timedelta, timezone

import pytest

from app.errors import BadRequest, Conflict, Unauthorized
from app.services.auth_service import AuthService


def test_signup_then_login(db):
    svc = AuthService()
    user = svc.signup("nova", "Nova", "hunter2")
    assert user.id == "local-nova"
    assert user.password_hash and "hunter2" not in user.password_hash  # never plaintext

    again = svc.login_local("nova", "hunter2")
    assert again.id == "local-nova"


def test_duplicate_username_rejected(db):
    svc = AuthService()
    svc.signup("kaz", "Kaz", "hunter2")
    with pytest.raises(Conflict):
        svc.signup("kaz", "Other", "hunter2")


def test_weak_password_rejected(db):
    with pytest.raises(BadRequest):
        AuthService().signup("dex", "Dex", "123")


def test_bad_login_rejected(db):
    svc = AuthService()
    svc.signup("mira", "Mira", "hunter2")
    with pytest.raises(Unauthorized):
        svc.login_local("mira", "wrong")


def test_reset_flow_single_use(db):
    svc = AuthService()
    svc.signup("juno", "Juno", "hunter2")
    url = svc.request_reset("juno", "http://test.local")
    token = url.split("token=")[1]

    svc.perform_reset(token, "newpass1")
    assert svc.login_local("juno", "newpass1").id == "local-juno"

    # Token is single-use.
    with pytest.raises(BadRequest):
        svc.perform_reset(token, "another1")


def test_reset_token_expires(db):
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    svc = AuthService(clock=lambda: now)
    svc.signup("late", "Late", "hunter2")
    url = svc.request_reset("late", "http://test.local")
    token = url.split("token=")[1]

    # Advance the injected clock past the TTL.
    svc.clock = lambda: now + timedelta(hours=1)
    with pytest.raises(BadRequest):
        svc.perform_reset(token, "newpass1")
