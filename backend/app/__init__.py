import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from .config import Config
from .errors import DomainError
from .extensions import db, limiter


def create_app(config_object=Config):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_object)

    # Dev: Vite (:5173) calls the API cross-origin with cookies. Prod is same-origin.
    CORS(
        app,
        supports_credentials=True,
        origins=os.environ.get(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(","),
    )

    db.init_app(app)
    limiter.init_app(app)

    from . import models  # noqa: F401  (register models)
    from .routes import api_bp, auth_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)

    _register_error_handlers(app)

    with app.app_context():
        db.create_all()

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok"})

    _register_frontend(app)
    return app


def _register_error_handlers(app):
    @app.errorhandler(DomainError)
    def handle_domain_error(err):
        return jsonify({"error": err.code}), err.status

    @app.errorhandler(429)
    def handle_rate_limited(err):
        return jsonify({"error": "rate_limited"}), 429


def _register_frontend(app):
    """In prod, serve the built React app. Falls back to index.html for SPA routes."""
    dist = os.environ.get("FRONTEND_DIST", "/app/frontend_dist")
    if not os.path.isdir(dist):
        return

    @app.get("/")
    @app.get("/<path:path>")
    def spa(path=""):
        full = os.path.join(dist, path)
        if path and os.path.isfile(full):
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")
