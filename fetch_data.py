"""
YOUR-BRO Channel Data Scraper
Runs via GitHub Actions — writes real YouTube stats to data.json
"""

import json
import re
import time
import urllib.request
from datetime import datetime, timezone

CHANNEL_URL = "https://www.youtube.com/@YOURBR0-f1h/about"

def fetch():
    req = urllib.request.Request(CHANNEL_URL, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", errors="replace")

def parse(html):
    # Subscriber count
    subs_match = (
        re.search(r'"subscriberCountText":"([\d,\.]+\s*[KMB]?\s*subscribers?)"', html) or
        re.search(r'"content":"([\d,\.]+\s*subscribers?)"', html)
    )
    subs_text = subs_match.group(1).strip() if subs_match else "50 subscribers"

    # Parse number
    num = re.search(r"([\d,\.]+)\s*([KMkm]?)", subs_text)
    subs_num = 50
    if num:
        raw = float(num.group(1).replace(",", ""))
        mult = num.group(2).upper()
        if mult == "K": raw *= 1000
        elif mult == "M": raw *= 1_000_000
        subs_num = int(raw)

    # Channel name
    name = re.search(r'"channelMetadataRenderer":\{"title":"([^"]+)"', html)
    # Avatar
    avatar = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    # Joined
    joined = (
        re.search(r'"content":"(Joined [^"]+)"', html) or
        re.search(r'"Joined ([^"]+)"', html)
    )

    return {
        "name": name.group(1) if name else "YOUR-BRO",
        "handle": "@YOURBR0-f1h",
        "subscribers": subs_num,
        "subscribersText": subs_text,
        "avatarUrl": avatar.group(1) if avatar else "",
        "joined": joined.group(1) if joined else "Joined Dec 24, 2020",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

if __name__ == "__main__":
    print("Fetching channel data...")
    try:
        html = fetch()
        data = parse(html)
        with open("data.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Done: {data['name']} — {data['subscribers']} subscribers")
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        # Write fallback so the file always exists
        fallback = {
            "name": "YOUR-BRO",
            "handle": "@YOURBR0-f1h",
            "subscribers": 50,
            "subscribersText": "50 subscribers",
            "avatarUrl": "https://yt3.googleusercontent.com/9VZB7YXDFfP0dO3wcI760jFHDLt-kCTiy-XWWKQTm4fk3ZMDngj86Ok8vZqO31VhaSA7GLk0rA=s900-c-k-c0x00ffffff-no-rj",
            "joined": "Joined Dec 24, 2020",
            "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        with open("data.json", "w", encoding="utf-8") as f:
            json.dump(fallback, f, indent=2)
        print("Wrote fallback data.json")
        raise
