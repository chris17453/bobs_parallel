"""Audio proxy validation (allowlist / SSRF guard). No real network in tests."""
import pytest

from app.errors import BadRequest, Forbidden
from app.services.audio_service import validated_src


def test_allows_known_preview_hosts():
    assert validated_src("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3")
    assert validated_src("https://p.scdn.co/mp3-preview/abc123")


def test_rejects_other_hosts_and_schemes():
    with pytest.raises(Forbidden):
        validated_src("https://evil.example.com/x.mp3")
    with pytest.raises(Forbidden):
        validated_src("https://169.254.169.254/latest/meta-data")  # SSRF target
    with pytest.raises(BadRequest):
        validated_src("http://www.soundhelix.com/x.mp3")  # not https
    with pytest.raises(BadRequest):
        validated_src("")  # missing


def test_audio_endpoint_validates_before_fetching(client):
    # Disallowed host is rejected with 403 and never hits the network.
    resp = client.get("/api/audio?src=https://evil.example.com/x.mp3")
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "host_not_allowed"

    assert client.get("/api/audio").status_code == 400  # missing src
