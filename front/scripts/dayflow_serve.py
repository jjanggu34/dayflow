#!/usr/bin/env python3
"""DAYFLOW 로컬 정적 서버 + Open-Meteo 프록시(동일 출처로 날씨 fetch, CORS 없음).

  cd dayflow && python3 front/scripts/dayflow_serve.py

  포트 변경: DAYFLOW_PORT=8080 python3 front/scripts/dayflow_serve.py

  브라우저: http://127.0.0.1:5173/ (기본 포트 5173)
  날씨: resultWeather.js 가 /api/open-meteo/v1/forecast?... 로 요청 → 이 서버가 Open-Meteo로 전달.

  친숙 URL(/main, /report 등)은 scripts/dev-front.mjs 와 동일하게 HTML 경로로 치환합니다.
"""
from __future__ import annotations

import http.server
import os
import socketserver
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

FRONT_DIR = Path(__file__).resolve().parent.parent

# 긴 경로 우선 (dev-front.mjs 의 rewrites 와 동기화)
_PATH_REWRITES: list[tuple[str, str]] = [
    ("/chat/emotion", "/views/chat/emotion.html"),
    ("/chat/result", "/views/chat/result.html"),
    ("/chat", "/views/chat/chat.html"),
    ("/login", "/views/login.html"),
    ("/home", "/views/home/home.html"),
    ("/main", "/views/main/main.html"),
    ("/report/report", "/views/report/report.html"),
    ("/report", "/views/report/report.html"),
    ("/advice/advice", "/views/advice/advice.html"),
    ("/advice", "/views/advice/advice.html"),
    ("/my", "/views/my/my.html"),
    ("/", "/index.html"),
]


def _normalize_pathname(pathname: str) -> str:
    p = pathname or "/"
    if len(p) > 1 and p.endswith("/"):
        p = p[:-1]
    return p


def _rewrite_pathname(pathname: str) -> Optional[str]:
    p = _normalize_pathname(pathname)
    for from_p, to_p in _PATH_REWRITES:
        if p == from_p:
            return to_p
    return None


_DEFAULT_PORT = 5173
_LISTEN_PORT = int(os.environ.get("DAYFLOW_PORT", str(_DEFAULT_PORT)))
LISTEN = ("127.0.0.1", _LISTEN_PORT)
OPEN_METEO = "https://api.open-meteo.com"
API_PREFIX = "/api/open-meteo"


class DayflowHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONT_DIR), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        print(f"[dayflow_serve] {fmt % args}")

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith(API_PREFIX + "/") or parsed.path == API_PREFIX:
            self._proxy_open_meteo(parsed)
            return
        to_path = _rewrite_pathname(parsed.path)
        if to_path is not None:
            self.path = to_path + (("?" + parsed.query) if parsed.query else "")
        super().do_GET()

    def _proxy_open_meteo(self, parsed: urllib.parse.ParseResult) -> None:
        tail = parsed.path[len(API_PREFIX) :] or "/"
        if not tail.startswith("/v1/"):
            self.send_error(404, "Only Open-Meteo /v1/* is proxied")
            return
        url = OPEN_METEO + tail
        if parsed.query:
            url += "?" + parsed.query
        try:
            req = urllib.request.Request(
                url,
                method="GET",
                headers={"User-Agent": "dayflow-local-dev/1.0"},
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                body = resp.read()
                self.send_response(resp.status)
                ct = resp.headers.get("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Type", ct)
                self.send_header("Cache-Control", "public, max-age=120")
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            err = e.read() if e.fp else b"{}"
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(err)
        except Exception:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error":"open_meteo_proxy_failed"}')


if __name__ == "__main__":
    with socketserver.ThreadingTCPServer(LISTEN, DayflowHandler) as httpd:
        print(f"DAYFLOW front + weather proxy → http://{LISTEN[0]}:{LISTEN[1]}/")
        print("  (python -m http.server 대신 이 스크립트를 쓰면 날씨 API가 동작합니다.)")
        print("  예: /main /report /chat/emotion … (친숙 URL 지원)")
        httpd.serve_forever()
