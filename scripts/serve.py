#!/usr/bin/env python3
"""本地静态服务器（no-store）：避免浏览器启发式缓存旧 JS/CSS，导致页面修改"不生效"。

用法：
    python3 scripts/serve.py [port]   # 默认 4173
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"Serving {ROOT} on http://localhost:{PORT} (Cache-Control: no-store)")
        httpd.serve_forever()
