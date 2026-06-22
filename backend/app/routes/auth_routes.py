"""Thin HTTP layer for auth: Spotify OAuth, local accounts, dev-login, QR reset."""
import secrets
import urllib.parse

import requests
from flask import (
    Blueprint, current_app, jsonify, redirect, request, session,
)

from ..errors import BadRequest, Forbidden
from ..extensions import limiter
from ..services import AuthService
from ..spotify_client import SPOTIFY_API, SPOTIFY_AUTH_URL, SPOTIFY_TOKEN_URL

bp = Blueprint("auth", __name__, url_prefix="/auth")

# Throttle credential + token endpoints to blunt brute force / abuse.
LOGIN_LIMIT = "20 per minute"
SIGNUP_LIMIT = "10 per minute"
RESET_LIMIT = "10 per minute"

auth_service = AuthService()

SCOPES = "user-read-email user-read-private user-top-read"


def _spotify_configured():
    cfg = current_app.config
    return bool(cfg.get("SPOTIFY_CLIENT_ID") and cfg.get("SPOTIFY_CLIENT_SECRET"))


def _start_session(user):
    session["user_id"] = user.id


# ---------- Spotify OAuth ----------
@bp.get("/login")
def login():
    if not _spotify_configured():
        return redirect("/auth/dev-login")
    cfg = current_app.config
    state = secrets.token_urlsafe(16)
    session["oauth_state"] = state
    params = {
        "client_id": cfg["SPOTIFY_CLIENT_ID"],
        "response_type": "code",
        "redirect_uri": cfg["SPOTIFY_REDIRECT_URI"],
        "scope": SCOPES,
        "state": state,
    }
    return redirect(f"{SPOTIFY_AUTH_URL}?{urllib.parse.urlencode(params)}")


@bp.get("/callback")
def callback():
    cfg = current_app.config
    if request.args.get("state") != session.pop("oauth_state", None):
        return jsonify({"error": "state_mismatch"}), 400
    code = request.args.get("code")
    if not code:
        return jsonify({"error": request.args.get("error", "no_code")}), 400

    token_resp = requests.post(
        SPOTIFY_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": cfg["SPOTIFY_REDIRECT_URI"],
            "client_id": cfg["SPOTIFY_CLIENT_ID"],
            "client_secret": cfg["SPOTIFY_CLIENT_SECRET"],
        },
        timeout=15,
    )
    token_resp.raise_for_status()
    access_token = token_resp.json()["access_token"]
    profile = requests.get(
        f"{SPOTIFY_API}/me",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    ).json()
    user = auth_service.upsert_spotify_user(profile)
    _start_session(user)
    return redirect("/")


# ---------- Local accounts ----------
@bp.post("/signup")
@limiter.limit(SIGNUP_LIMIT)
def signup():
    body = request.get_json(silent=True) or {}
    user = auth_service.signup(
        body.get("username"), body.get("display_name"), body.get("password")
    )
    _start_session(user)
    return jsonify({"user": user.to_base_dict()})


@bp.post("/login-local")
@limiter.limit(LOGIN_LIMIT)
def login_local():
    body = request.get_json(silent=True) or {}
    user = auth_service.login_local(body.get("username"), body.get("password"))
    session.permanent = bool(body.get("remember", True))
    _start_session(user)
    return jsonify({"user": user.to_base_dict()})


# ---------- QR / URL password reset ----------
@bp.post("/reset/request")
@limiter.limit(RESET_LIMIT)
def reset_request():
    body = request.get_json(silent=True) or {}
    base_url = current_app.config.get("PUBLIC_BASE_URL", request.host_url)
    reset_url = auth_service.request_reset(body.get("username"), base_url)
    # The URL is the bearer secret -> return it once for the client to render as a QR.
    return jsonify({"reset_url": reset_url})


@bp.post("/reset")
def reset():
    body = request.get_json(silent=True) or {}
    if not body.get("token"):
        raise BadRequest("missing_token")
    user = auth_service.perform_reset(body.get("token"), body.get("new_password"))
    return jsonify({"user": user.to_base_dict()})


# ---------- Dev login ----------
@bp.route("/dev-login", methods=["GET", "POST"])
def dev_login():
    if _spotify_configured():
        raise Forbidden("dev_login_disabled_use_spotify")
    user = auth_service.dev_login()
    _start_session(user)
    if request.method == "POST":
        return jsonify({"user": user.to_base_dict()})
    return redirect("/")


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})
