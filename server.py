#!/usr/bin/env python3
"""
YOUR-BRO Live Dashboard - Backend Server
Serves static files + /api/channel endpoint with real YouTube data
"""

import json
import re
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
import os

CHANNEL_URL = "https://www.youtube.com/@YOURBR0-f1h/about"
CACHE = {}
CACHE_LOCK = threading.Lock()
CACHE_TTL = 120  # seconds between refreshes
import time

def fetch_channel_data():
    """Scrape real channel stats from YouTube."""
    try:
        req = urllib.request.Request(CHANNEL_URL, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        with urllib.request.urlopen(req, timeout=15) as r:
            html = r.read().decode('utf-8', errors='replace')

        # Extract subscriber count
        subs_match = re.search(r'"subscriberCountText":"([\d,\.]+\s*[KMB]?\s*subscribers?)"', html)
        if not subs_match:
            subs_match = re.search(r'"content":"([\d,\.]+\s*subscribers?)"', html)
        subs_text = subs_match.group(1) if subs_match else "50 subscribers"

        # Parse number from text
        num_match = re.search(r'([\d,\.]+)\s*([KMkm]?)', subs_text)
        subs_num = 50
        if num_match:
            raw = num_match.group(1).replace(',', '')
            mult = num_match.group(2).upper()
            val = float(raw)
            if mult == 'K': val *= 1000
            elif mult == 'M': val *= 1000000
            subs_num = int(val)

        # Channel name
        name_match = re.search(r'"channelMetadataRenderer":\{"title":"([^"]+)"', html)
        name = name_match.group(1) if name_match else "YOUR-BRO"

        # Avatar
        og_img = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        avatar_url = og_img.group(1) if og_img else ""

        # Description
        desc_match = re.search(r'"description":\{"simpleText":"([^"]+)"', html)
        description = desc_match.group(1)[:200] if desc_match else ""

        # Joined date
        joined_match = re.search(r'"Joined ([^"]+)"', html)
        if not joined_match:
            joined_match = re.search(r'"content":"(Joined [^"]+)"', html)
        joined = joined_match.group(1) if joined_match else "Joined Dec 24, 2020"

        return {
            "success": True,
            "name": name,
            "subscribers": subs_num,
            "subscribersText": subs_text.strip(),
            "avatarUrl": avatar_url,
            "description": description,
            "joined": joined,
            "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    except Exception as e:
        print(f"[Scraper Error] {e}")
        return {
            "success": False,
            "error": str(e),
            "name": "YOUR-BRO",
            "subscribers": 50,
            "subscribersText": "50 subscribers",
            "avatarUrl": "",
            "description": "",
            "joined": "Joined Dec 24, 2020",
            "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

def refresh_cache():
    """Refresh the channel data cache in the background."""
    while True:
        data = fetch_channel_data()
        with CACHE_LOCK:
            CACHE.update(data)
            CACHE['_cached_at'] = time.time()
        status = "OK" if data.get("success") else "ERR"
        print(f"[{time.strftime('%H:%M:%S')}] Cache refresh [{status}] — {data.get('subscribers')} subs")
        time.sleep(CACHE_TTL)

class Handler(BaseHTTPRequestHandler):
    STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

    def log_message(self, format, *args):
        # Only log API calls, not static files
        if "/api/" in (args[0] if args else ""):
            print(f"[{self.address_string()}] {format % args}")

    def send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]

        if path == "/api/channel":
            with CACHE_LOCK:
                data = dict(CACHE)
            body = json.dumps(data, ensure_ascii=False).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors()
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(body)
            return

        # Static file serving
        if path == "/" or path == "":
            path = "/index.html"

        file_path = os.path.join(self.STATIC_DIR, path.lstrip("/"))
        if os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            mime = {
                ".html": "text/html; charset=utf-8",
                ".css":  "text/css",
                ".js":   "application/javascript",
                ".png":  "image/png",
                ".jpg":  "image/jpeg",
                ".ico":  "image/x-icon",
                ".json": "application/json",
            }.get(ext, "application/octet-stream")

            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

if __name__ == "__main__":
    PORT = 3000

    # Initial cache load (blocking so first request works)
    print("[Server] Fetching initial channel data...")
    initial = fetch_channel_data()
    with CACHE_LOCK:
        CACHE.update(initial)
        CACHE['_cached_at'] = time.time()
    print(f"[Server] Channel: {initial['name']} — {initial['subscribers']} subscribers")

    # Start background refresh thread
    t = threading.Thread(target=refresh_cache, daemon=True)
    t.start()

    # Start HTTP server
    server = HTTPServer(("localhost", PORT), Handler)
    print(f"[Server] YOUR-BRO Dashboard running at http://localhost:{PORT}")
    print(f"[Server] Channel API: http://localhost:{PORT}/api/channel")
    print(f"[Server] Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Stopped.")
