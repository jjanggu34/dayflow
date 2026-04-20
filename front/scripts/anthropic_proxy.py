#!/usr/bin/env python3
"""로컬 CORS 프록시 — Anthropic /v1/messages 로 POST 를 그대로 전달합니다.

터미널:
  python3 front/scripts/anthropic_proxy.py

그다음 chat.html 에서 chat.js 로드 *전에* 한 줄 추가:
  <script>window.DAYFLOW_ANTHROPIC_URL = "http://127.0.0.1:8787/v1/messages";</script>

API 키는 브라우저가 기존처럼 x-api-key 헤더로 보냅니다(로컬 전용).
"""
from __future__ import annotations

import http.server
import json
import urllib.error
import urllib.request

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
LISTEN = ("127.0.0.1", 8787)


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"[anthropic_proxy] {fmt % args}")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, anthropic-version, x-api-key, anthropic-beta",
        )
        self.end_headers()

    def do_POST(self) -> None:
        if self.path != "/v1/messages":
            self.send_error(404, "Use POST /v1/messages")
            return

        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else b""

        req = urllib.request.Request(ANTHROPIC_URL, data=body, method="POST")
        req.add_header("Content-Type", self.headers.get("Content-Type", "application/json"))
        req.add_header("anthropic-version", self.headers.get("anthropic-version", "2023-06-01"))
        key = self.headers.get("x-api-key", "")
        if key:
            req.add_header("x-api-key", key)

        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
                self.send_response(r.status)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            err_body = e.read() if e.fp else b"{}"
            self.send_response(e.code)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as e:
            self.send_response(502)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(
                json.dumps({"error": {"type": "proxy_error", "message": str(e)}}).encode("utf-8")
            )


if __name__ == "__main__":
    httpd = http.server.HTTPServer(LISTEN, ProxyHandler)
    print(f"Anthropic proxy listening on http://{LISTEN[0]}:{LISTEN[1]}/v1/messages")
    httpd.serve_forever()
