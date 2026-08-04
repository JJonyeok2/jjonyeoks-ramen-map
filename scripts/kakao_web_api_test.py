import requests
import json
import urllib.parse

query = urllib.parse.quote('라멘')
url = f'https://search.map.kakao.com/mapsearch/map.daum?callback=cb&q={query}&msFlag=A&sort=0'
headers = {
    'Referer': 'https://map.kakao.com/',
    'User-Agent': 'Mozilla/5.0'
}

r = requests.get(url, headers=headers)
r.encoding = 'utf-8'
text = r.text

try:
    json_str = text.split('cb(')[1][:-1]
    data = json.loads(json_str)
    places = data.get('place', [])
    print(f"Found {len(places)} places")
    if places:
        print(json.dumps(places[0], ensure_ascii=False, indent=2))
except Exception as e:
    print("Error parsing response:", e)
    print(text[:200])
