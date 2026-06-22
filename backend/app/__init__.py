import os

from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .extensions import db


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    # Dev: Vite runs on :5173 and calls the API cross-origin with cookies.
    CORS(
        app,
        supports_credentials=True,
        origins=os.environ.get(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(","),
    )

    db.init_app(app)

    from . import models  # noqa: F401  (register models)
    from .auth import bp as auth_bp
    from .api import bp as api_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)

    with app.app_context():
        db.create_all()

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok"})

    return app
