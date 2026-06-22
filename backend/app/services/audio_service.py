"""Audio proxy validation.

We stream 30s previews through our own origin so the browser gets them CORS-clean (which
also lets the Visualizer read real FFT). To avoid becoming an open proxy / SSRF vector, only
https URLs on a small allowlist of known preview hosts are permitted.
"""
from urllib.parse import urlparse

from ..errors import BadRequest, Forbidden

ALLOWED_HOSTS = {"www.soundhelix.com", "soundhelix.com"}
ALLOWED_SUFFIXES = (".scdn.co",)  # Spotify preview CDNs, e.g. p.scdn.co


def validated_src(src):
    """Return src if it's an allowed https preview URL, else raise a domain error."""
    if not src:
        raise BadRequest("missing_src")
    parsed = urlparse(src)
    if parsed.scheme != "https":
        raise BadRequest("bad_scheme")
    host = (parsed.hostname or "").lower()
    if host in ALLOWED_HOSTS or host.endswith(ALLOWED_SUFFIXES):
        return src
    raise Forbidden("host_not_allowed")
