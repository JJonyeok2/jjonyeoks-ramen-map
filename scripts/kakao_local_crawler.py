# -*- coding: utf-8 -*-
import requests
import json
import time

KAKAO_API_KEY = "dc4f207854aa616db4b19febdebda41e"
HEADERS = {"Authorization": f"KakaoAK {KAKAO_API_KEY}"}

QUERIES = [
    "서울 라멘", "경기 라멘", "부산 라멘", "대구 라멘", "인천 라멘", 
    "제주 라멘", "대전 라멘", "광주 라멘", "울산 라멘", "강원 라멘", 
    "충청 라멘", "전라 라멘", "경상 라멘"
]

def main():
    all_shops = []
    seen_ids = set()

    for q in QUERIES:
        print(f"Searching for: {q}")
        page = 1
        while page <= 45:
            url = "https://dapi.kakao.com/v2/local/search/keyword.json"
            params = {"query": q.encode('utf-8'), "page": page, "size": 15}
            try:
                resp = requests.get(url, headers=HEADERS, params={"query": q, "page": page, "size": 15}, timeout=10)
                if resp.status_code != 200:
                    break
                
                data = resp.json()
                documents = data.get("documents", [])
                
                for doc in documents:
                    if doc["id"] in seen_ids:
                        continue
                    if "일본식라면" not in doc.get("category_name", "") and "라멘" not in doc.get("category_name", ""):
                        continue
                        
                    seen_ids.add(doc["id"])
                    shop = {
                        "name": doc["place_name"],
                        "address": doc["road_address_name"] or doc["address_name"],
                        "lat": float(doc["y"]),
                        "lng": float(doc["x"]),
                        "category": doc["category_name"],
                        "place_url": doc["place_url"]
                    }
                    all_shops.append(shop)
                
                if data.get("meta", {}).get("is_end"):
                    break
                
                page += 1
                time.sleep(0.1)
            except Exception as e:
                break
                
    print(f"Total unique ramen shops crawled: {len(all_shops)}")
    
    with open("kakao_crawled.json", "w", encoding="utf-8") as f:
        json.dump(all_shops, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
