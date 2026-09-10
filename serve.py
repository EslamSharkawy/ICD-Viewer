#!/usr/bin/env python3
"""Serve the explorer on http://localhost:8000

The browser refuses to read the data files straight off the disk, so the app
needs to be served over http rather than opened as a file.

    python serve.py            # then open http://localhost:8000
    python serve.py 9000       # a different port
"""

import functools
import http.server
import os

import sys
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.tsv': 'text/plain',
    }

    def end_headers(self):
        # Nothing here is cached long: the data is rebuilt in place.
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '404' in (args[1] if len(args) > 1 else ''):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    # Threaded: the app asks for several data files at once, and a
    # single-threaded server makes them queue up behind each other.
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler) as httpd:
        url = 'http://localhost:%d/' % PORT
        print('ICD-10-CM Notes Explorer running at %s' % url)
        print('Press Ctrl+C to stop.')
        try:
            webbrowser.open(url)
        except Exception:
            pass
        httpd.serve_forever()
