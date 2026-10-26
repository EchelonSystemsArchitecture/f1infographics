"""Security regression checks for the public read-only API and frontend source.

These are defensive checks, not a penetration test. They cover path traversal,
reflection, exposure of operational detail, transport hardening, secrets in
source, dangerous DOM sinks, and dependency-pinning hygiene.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend" / "app"
FRONTEND = ROOT / "frontend" / "src"
KEY = 9558


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.mark.parametrize(
    "path",
    [
        "/backend/data/sessions.json",
        "/api/session/%2e%2e%2f%2e%2e%2fsessions.json/state?t=0",
        "/api/session/..%2f..%2fetc/state?t=0",
        "/api/session/9558/..%2f..%2f..%2fmain.py",
        "/api/session/9558/state/../../../../etc/passwd",
    ],
)
def test_path_traversal_is_not_possible(client, path):
    response = client.get(path)
    assert response.status_code in (404, 422)
    assert "root:" not in response.text
    assert "session_key" not in response.text or response.status_code != 200


def test_static_backend_data_is_not_served(client):
    response = client.get("/backend/data/sessions.json")
    assert response.status_code == 404
    assert "session_key" not in response.text


def test_telemetry_does_not_execute_sql_or_script_payloads(client):
    payload = "<script>alert(1)</script>"
    response = client.get(f"/api/session/{KEY}/telemetry", params={"drivers": payload})
    assert response.status_code == 400
    assert response.headers["content-type"].startswith("application/json")
    assert "<script>" not in response.text


def test_error_reflection_is_json_encoded_not_html(client):
    response = client.get(
        f"/api/session/{KEY}/telemetry", params={"drivers": "<img src=x onerror=alert(1)>"}
    )
    assert response.status_code == 400
    assert "text/html" not in response.headers["content-type"]
    assert response.headers["content-type"].startswith("application/json")


def test_large_reflected_input_is_bounded_by_response_size(client):
    response = client.get(f"/api/session/{KEY}/telemetry", params={"drivers": "9" * 5000})
    assert response.status_code == 400
    assert len(response.content) < 10_000


def test_overflowing_time_input_is_rejected(client):
    response = client.get(f"/api/session/{KEY}/state", params={"t": "9" * 400})
    assert response.status_code == 422


def test_duplicate_query_parameters_take_the_last_value(client):
    response = client.get(f"/api/session/{KEY}/state", params=[("t", "0"), ("t", "100")])
    assert response.status_code == 200
    assert response.json()["t_seconds"] == 100


def test_no_cors_wildcard_is_enabled(client):
    response = client.options(
        "/api/sessions",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code in (400, 405)
    assert "access-control-allow-origin" not in response.headers


def test_no_authentication_or_cookie_state(client):
    response = client.get("/api/health")
    assert "set-cookie" not in response.headers
    assert "authorization" not in response.headers


def test_trace_method_is_disabled(client):
    assert client.request("TRACE", "/api/sessions").status_code == 405


@pytest.mark.parametrize("method", ["PUT", "PATCH", "DELETE", "POST"])
def test_write_methods_are_disabled(client, method):
    assert client.request(method, "/api/sessions").status_code == 405


def test_diagnostics_does_not_disclose_filesystem_path(client):
    body = client.get("/api/diagnostics").json()
    assert not Path(body["data_dir"]).is_absolute()
    assert body["data_dir"] == "backend/data"


def test_openapi_route_inventory_is_not_exposed(client):
    assert client.get("/openapi.json").status_code == 404


def test_security_headers_are_present(client):
    response = client.get("/api/health")
    for header in (
        "content-security-policy",
        "x-content-type-options",
        "x-frame-options",
        "referrer-policy",
        "permissions-policy",
        "strict-transport-security",
    ):
        assert header in response.headers


def test_engine_response_does_not_leak_internals(client):
    response = client.get("/api/session/10014/driver-lab")
    assert response.status_code == 200
    assert "Traceback" not in response.text
    assert "number_of_laps" not in response.text
    assert "app\\driver_lab" not in response.text


def test_rate_limit_headers_are_present(client):
    statuses = [client.get("/api/session/9558/state", params={"t": 0}).status_code for _ in range(50)]
    assert statuses == [200] * 50
    response = client.get("/api/health")
    assert response.headers["x-ratelimit-limit"] == "600"
    assert int(response.headers["x-ratelimit-remaining"]) >= 0


def _source_files(root: Path, suffixes: tuple[str, ...]) -> list[Path]:
    return [
        path
        for path in root.rglob("*")
        if path.is_file() and path.suffix in suffixes and "tests" not in path.parts
    ]


def test_no_dangerous_dom_sinks_in_frontend():
    patterns = ("dangerouslySetInnerHTML", "innerHTML", "document.write", "new Function", "eval(")
    offenders = []
    for path in _source_files(FRONTEND, (".ts", ".tsx")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in patterns:
            if pattern in text:
                offenders.append((path.name, pattern))
    assert offenders == []


def test_no_secret_patterns_in_source():
    patterns = (
        re.compile(r"AKIA[0-9A-Z]{16}"),
        re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
        re.compile(r"sk-[A-Za-z0-9]{20,}"),
        re.compile(r"-----BEGIN (RSA |EC )?PRIVATE KEY-----"),
    )
    offenders = []
    for root in (BACKEND, FRONTEND):
        for path in _source_files(root, (".py", ".ts", ".tsx")):
            text = path.read_text(encoding="utf-8", errors="ignore")
            for pattern in patterns:
                if pattern.search(text):
                    offenders.append((path.name, pattern.pattern))
    assert offenders == []


def test_no_env_files_are_committed():
    result = subprocess.run(
        ["git", "ls-files", "--", ".env", ".env.*", "*.env", "*.env.*"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.stdout.strip() == ""


def test_gitignore_covers_secrets_and_build_artifacts():
    text = (ROOT / ".gitignore").read_text()
    for entry in (".env*", "node_modules/", "backend/cache/", "dist/"):
        assert entry in text


def test_vercelignore_excludes_tests_and_docs():
    text = (ROOT / ".vercelignore").read_text()
    assert "backend/app/tests/" in text
    assert "docs/" in text
    assert "backend/.venv/" in text


def test_backend_requirements_pin_production_dependencies():
    lines = [
        line.strip()
        for line in (ROOT / "backend" / "requirements.txt").read_text().splitlines()
        if line.strip()
    ]
    assert all("==" in line for line in lines)
    assert not any(line.startswith("pytest") for line in lines)
    dev = (ROOT / "backend" / "requirements-dev.txt").read_text()
    assert "pytest==" in dev and "-r requirements.txt" in dev


def test_frontend_lockfile_is_committed():
    assert (ROOT / "frontend" / "package-lock.json").is_file()
    data = json.loads((ROOT / "frontend" / "package-lock.json").read_text())
    assert data["lockfileVersion"] >= 3


def test_no_remote_script_tags_in_shell():
    html = (ROOT / "frontend" / "index.html").read_text()
    assert "http://" not in html
    assert "https://" not in html
    assert "integrity=" not in html


def test_no_wildcard_cors_origins_in_source():
    offenders = []
    for path in _source_files(BACKEND, (".py",)):
        text = path.read_text(encoding="utf-8", errors="ignore")
        if re.search(r"allow_origins\s*=\s*\[\s*['\"]\*", text):
            offenders.append(path.name)
    assert offenders == []


def test_api_is_read_only():
    routes = {route.path for route in app.routes}
    assert "/api/sessions" in routes
    write_methods = {"POST", "PUT", "PATCH", "DELETE"}
    offenders = []
    for route in app.routes:
        path = getattr(route, "path", "")
        methods = set(getattr(route, "methods", set()) or set())
        if path.startswith("/api/") and methods & write_methods:
            offenders.append((path, sorted(methods)))
    assert offenders == []


def test_docs_are_not_exposed_without_auth(client):
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404


def test_headers_do_not_reveal_server_version(client):
    response = client.get("/api/health")
    assert "server" not in response.headers or "uvicorn" not in response.headers["server"].lower()
    assert "x-powered-by" not in response.headers


def test_csp_is_configured_for_production_html():
    config = json.loads((ROOT / "vercel.json").read_text())
    headers = {
        header["key"]: header["value"]
        for group in config["headers"]
        for header in group["headers"]
    }
    policy = headers["Content-Security-Policy"]
    assert "script-src 'self'" in policy
    assert "script-src 'self' 'unsafe-inline'" not in policy
    assert "frame-ancestors 'none'" in policy


def test_api_returns_json_on_validation_errors(client):
    response = client.get(f"/api/session/{KEY}/state")
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/json")
    assert "detail" in response.json()


def test_invalid_session_key_does_not_read_outside_data_dir(client):
    response = client.get("/api/session/0/drivers")
    assert response.status_code == 404
    assert str(ROOT / "backend" / "data") not in response.text
