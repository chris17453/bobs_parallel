from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Storage/enabled are configured from app.config at init_app time.
limiter = Limiter(key_func=get_remote_address)
