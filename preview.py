#!/usr/bin/env python3
"""Open the local site in a browser with one click; no installation required."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import errno
import hashlib
import json
import sys
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener
import webbrowser


HOST = "127.0.0.1"
PORT = 4173
IDENTITY_PATH = "/.bone-appetit-preview"
ROOT = Path(__file__).resolve().parent
IDENTITY = {"project": "bone-appetit", "version": 1,
            "root": hashlib.sha256(str(ROOT).encode()).hexdigest()}


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path != IDENTITY_PATH:
            return super().do_GET()
        body = json.dumps(IDENTITY).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def is_our_preview(url):
    # Never follow redirects or proxy this loopback identity check elsewhere.
    from urllib.request import HTTPRedirectHandler

    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    try:
        with build_opener(ProxyHandler({}), NoRedirect()).open(
                url.rstrip("/") + IDENTITY_PATH, timeout=1) as response:
            return json.loads(response.read(1025)) == IDENTITY
    except (URLError, OSError, ValueError):
        return False


def main():
    handler = partial(PreviewHandler, directory=str(ROOT))
    url = f"http://{HOST}:{PORT}/"
    try:
        server = ThreadingHTTPServer((HOST, PORT), handler)
    except OSError as error:
        if error.errno == errno.EADDRINUSE and is_our_preview(url):
            print(f"Reopening Bone Appétit at {url}\nKeep the original preview window open.", flush=True)
            webbrowser.open(url)
            return 0
        print(f"Could not start Bone Appétit at {url}\n"
              "Close the service using that address, then open Preview.command again. "
              "No alternate address was opened; your saved plan stays at its usual address.",
              file=sys.stderr)
        return 1
    with server:
        print(f"Bone Appétit is open at {url}\nLeave this window open. Press Control-C to stop.", flush=True)
        webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nThe spirits have left the building.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
