import urllib.request
import re
import json

url = 'https://www.youtube.com/@YOURBR0-f1h/about'
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
})

with urllib.request.urlopen(req, timeout=15) as r:
    html = r.read().decode('utf-8', errors='replace')

# Patterns
subs_match = re.search(r'"subscriberCountText":\{"simpleText":"([^"]+)"', html)
name_match = re.search(r'"channelMetadataRenderer":\{"title":"([^"]+)"', html)
desc_match = re.search(r'"description":\{"simpleText":"([^"]+)"', html)
vid_match  = re.search(r'"videoCountText":\{"runs":\[\{"text":"([^"]+)"', html)
view_match = re.search(r'"viewCountText":\{"simpleText":"([^"]+)"', html)
og_img     = re.search(r'<meta property="og:image" content="([^"]+)"', html)

# Alternate patterns
subs_alt   = re.search(r'"subscribers":\{"simpleText":"([^"]+)"', html)
subs_alt2  = re.search(r'"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"', html)

print("=== CHANNEL DATA ===")
print("Name:", name_match.group(1) if name_match else "NOT FOUND")
print("Subscribers:", subs_match.group(1) if subs_match else (subs_alt.group(1) if subs_alt else (subs_alt2.group(1) if subs_alt2 else "NOT FOUND")))
print("Videos:", vid_match.group(1) if vid_match else "NOT FOUND")
print("Views:", view_match.group(1) if view_match else "NOT FOUND")
print("Description:", desc_match.group(1)[:120] if desc_match else "NOT FOUND")
print("Avatar:", og_img.group(1)[:100] if og_img else "NOT FOUND")
print("HTML Length:", len(html))
