"""Focused checks for stable preview startup and safe port-conflict handling."""
from contextlib import contextmanager, redirect_stderr, redirect_stdout
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import StringIO
from pathlib import Path
import json
import socket
import sys
import threading
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import preview


class QuietPreview(preview.PreviewHandler):
    def log_message(self, *args):
        pass


class ForeignHandler(BaseHTTPRequestHandler):
    body = b"An unrelated service"
    redirect = False

    def do_GET(self):
        self.send_response(302 if self.redirect else 200)
        if self.redirect:
            self.send_header("Location", self.redirect)
        self.end_headers()
        self.wfile.write(self.body)

    def log_message(self, *args):
        pass


@contextmanager
def running(handler):
    with ThreadingHTTPServer((preview.HOST, 0), handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield server
        finally:
            server.shutdown()
            thread.join()


class PreviewTests(unittest.TestCase):
    def test_restarts_use_the_same_origin_and_close_cleanly(self):
        with socket.socket() as probe:
            probe.bind((preview.HOST, 0))
            port = probe.getsockname()[1]
        with patch.object(preview, "PORT", port), \
                patch.object(ThreadingHTTPServer, "serve_forever", side_effect=KeyboardInterrupt), \
                patch.object(preview.webbrowser, "open") as opened, redirect_stdout(StringIO()):
            self.assertEqual(preview.main(), 0)
            self.assertEqual(preview.main(), 0)
            self.assertEqual(opened.call_count, 2)
            self.assertEqual(opened.call_args_list[0], opened.call_args_list[1])
            self.assertEqual(opened.call_args.args, (f"http://127.0.0.1:{port}/",))
        self.assertEqual(preview.PORT, 4173)

    def test_existing_preview_is_reused(self):
        with running(partial(QuietPreview, directory=str(preview.ROOT))) as server, \
                patch.object(preview, "PORT", server.server_port), \
                patch.object(preview.webbrowser, "open") as opened, redirect_stdout(StringIO()):
            self.assertTrue(preview.is_our_preview(f"http://127.0.0.1:{server.server_port}/"))
            self.assertEqual(preview.main(), 0)
            opened.assert_called_once()

    def assert_foreign_is_not_opened(self, handler):
        with running(handler) as server, patch.object(preview, "PORT", server.server_port), \
                patch.object(preview.webbrowser, "open") as opened, redirect_stderr(StringIO()) as error:
            self.assertEqual(preview.main(), 1)
            opened.assert_not_called()
            self.assertIn("No alternate address", error.getvalue())

    def test_unrelated_service_is_not_opened(self):
        self.assert_foreign_is_not_opened(ForeignHandler)

    def test_same_name_from_another_folder_is_not_opened(self):
        class OtherFolder(ForeignHandler):
            body = json.dumps({**preview.IDENTITY, "root": "another-folder"}).encode()
        self.assert_foreign_is_not_opened(OtherFolder)

    def test_redirect_is_not_followed(self):
        with running(partial(QuietPreview, directory=str(preview.ROOT))) as ours:
            class Redirect(ForeignHandler):
                redirect = f"http://127.0.0.1:{ours.server_port}{preview.IDENTITY_PATH}"
            self.assert_foreign_is_not_opened(Redirect)

    def test_unavailable_address_is_reported(self):
        with patch.object(preview, "ThreadingHTTPServer", side_effect=PermissionError("blocked")), \
                patch.object(preview.webbrowser, "open") as opened, redirect_stderr(StringIO()):
            self.assertEqual(preview.main(), 1)
            opened.assert_not_called()


if __name__ == "__main__":
    unittest.main()
