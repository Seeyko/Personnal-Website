#!/usr/bin/env python3
"""
Development server with SPA routing support.
Mimics nginx's try_files behavior for /blog routes.

Usage: python dev-server.py [port]
Default port: 8000
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    """Handler with SPA-style routing for blog routes."""

    def do_GET(self):
        # Remove query string for file checking
        path = self.path.split('?')[0]

        # Blog routes -> serve blog.html
        if path.startswith('/blog'):
            # Check if it's a real file first (like /blog.html itself)
            file_path = Path('.') / path.lstrip('/')
            if file_path.is_file():
                return super().do_GET()
            # Otherwise serve blog.html
            self.path = '/blog.html'

        # For other paths, check if file exists
        file_path = Path('.') / self.path.lstrip('/').split('?')[0]
        if not file_path.is_file() and not file_path.is_dir():
            # Fallback to index.html for SPA routing
            self.path = '/index.html'

        return super().do_GET()

    def end_headers(self):
        # Disable caching for development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)) or '.')

    # Threaded: a streaming request (the footer video) must not block the page.
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.daemon_threads = True
    with socketserver.ThreadingTCPServer(("", PORT), SPAHandler) as httpd:
        print(f"Development server running at http://localhost:{PORT}")
        print(f"Blog available at http://localhost:{PORT}/blog")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down...")
