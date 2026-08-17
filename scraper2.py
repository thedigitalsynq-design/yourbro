import urllib.request
import re

url = 'https://www.youtube.com/@YOURBR0-f1h/about'
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
})

with urllib.request.urlopen(req, timeout=15) as r:
    html = r.read().decode('utf-8', errors='replace')

# Search around "subscriber" keyword for context
hits = [m.start() for m in re.finditer(r'[Ss]ubscriber', html)]
print(f"Found 'subscriber' {len(hits)} times")
for h in hits[:10]:
    snippet = html[max(0, h-30):h+120]
    print(repr(snippet))
    print("---")
