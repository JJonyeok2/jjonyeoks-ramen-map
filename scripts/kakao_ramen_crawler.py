#!/usr/bin/env python3
"""
카카오맵 API 기반 전국 라멘집 대량 수집기
"""

import requests
import json
import time
import os

KAKAO_API_KEY = "e3648ffb9d5d72ff0ae1d65a046a2aaa"
OUTPUT_FILE = "kakao_raw_ramen.json"
CATEGORY_GROUP_CODE = "FD6"  # 음식점
DELAY = 0.25  # 요청 간격 (초)

HEADERS = {"Authorization": f"KakaoAK {KAKAO_API_KEY}"}
BASE_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

SEARCH_QUERIES = [
    # 서울 (25개 구)
    "강남구 라멘", "강동구 라멘", "강북구 라멘", "강서구 라멘", "관악구 라멘",
    "광진구 라멘", "구로구 라멘", "금천구 라멘", "노원구 라멘", "도봉구 라멘",
    "동대문구 라멘", "동작구 라멘", "마포구 라멘", "서대문구 라멘", "서초구 라멘",
    "성동구 라멘", "성북구 라멘", "송파구 라멘", "양천구 라멘", "영등포구 라멘",
    "용산구 라멘", "은평구 라멘", "종로구 라멘", "중구 라멘", "중랑구 라멘",
    # 경기
    "수원 라멘", "성남 라멘", "고양 라멘", "용인 라멘", "부천 라멘",
    "안산 라멘", "안양 라멘", "의정부 라멘", "파주 라멘", "김포 라멘",
    "화성 라멘", "광명 라멘", "군포 라멘", "오산 라멘", "시흥 라멘",
    "구리 라멘", "남양주 라멘", "하남 라멘", "평택 라멘", "이천 라멘",
    # 부산
    "부산진구 라멘", "해운대구 라멘", "동래구 라멘", "남구 라멘", "북구 라멘",
    "사상구 라멘", "사하구 라멘", "서구 라멘", "수영구 라멘", "연제구 라멘",
    "영도구 라멘", "중구 라멘", "강서구 라멘", "금정구 라멘", "기장군 라멘",
    # 대구
    "중구 라멘 대구", "동구 라멘 대구", "서구 라멘 대구", "남구 라멘 대구", "북구 라멘 대구",
    "수성구 라멘", "달서구 라멘", "달성군 라멘",
    # 인천
    "중구 라멘 인천", "동구 라멘 인천", "미추홀구 라멘", "연수구 라멘", "남동구 라멘",
    "부평구 라멘", "계양구 라멘", "서구 라멘 인천", "강화군 라멘", "옹진군 라멘",
    # 광주
    "동구 라멘 광주", "서구 라멘 광주", "남구 라멘 광주", "북구 라멘 광주", "광산구 라멘",
    # 대전
    "동구 라멘 대전", "중구 라멘 대전", "서구 라멘 대전", "유성구 라멘", "대덕구 라멘",
    # 울산
    "중구 라멘 울산", "남구 라멘 울산", "동구 라멘 울산", "북구 라멘 울산", "울주군 라멘",
    # 세종
    "세종 라멘",
    # 강원
    "춘천 라멘", "원주 라멘", "강릉 라멘", "동해 라멘", "태백 라멘",
    "속초 라멘", "삼척 라멘", "홍천 라멘", "횡성 라멘", "영월 라멘",
    "평창 라멘", "정선 라멘", "철원 라멘", "화천 라멘", "양구 라멘",
    "인제 라멘", "고성 라멘 강원", "양양 라멘",
    # 충북
    "청주 라멘", "충주 라멘", "제천 라멘", "보은 라멘", "옥천 라멘",
    "영동 라멘", "증평 라멘", "진천 라멘", "괴산 라멘", "음성 라멘",
    "단양 라멘",
    # 충남
    "천안 라멘", "공주 라멘", "보령 라멘", "아산 라멘", "서산 라멘",
    "논산 라멘", "계룡 라멘", "당진 라멘", "금산 라멘", "부여 라멘",
    "서천 라멘", "청양 라멘", "홍성 라멘", "예산 라멘", "태안 라멘",
    # 전북
    "전주 라멘", "군산 라멘", "익산 라멘", "정읍 라멘", "남원 라멘",
    "김제 라멘", "완주 라멘", "진안 라멘", "무주 라멘", "장수 라멘",
    "임실 라멘", "순창 라멘", "고창 라멘", "부안 라멘",
    # 전남
    "목포 라멘", "여수 라멘", "순천 라멘", "나주 라멘", "광양 라멘",
    "담양 라멘", "곡성 라멘", "구례 라멘", "고흥 라멘", "보성 라멘",
    "화순 라멘", "장흥 라멘", "강진 라멘", "해남 라멘", "영암 라멘",
    "무안 라멘", "함평 라멘", "영광 라멘", "장성 라멘", "완도 라멘",
    "진도 라멘", "신안 라멘",
    # 경북
    "포항 라멘", "경주 라멘", "김천 라멘", "안동 라멘", "구미 라멘",
    "영주 라멘", "영천 라멘", "상주 라멘", "문경 라멘", "경산 라멘",
    "군위 라멘", "의성 라멘", "청송 라멘", "영양 라멘", "영덕 라멘",
    "청도 라멘", "고령 라멘", "성주 라멘", "칠곡 라멘", "예천 라멘",
    "봉화 라멘", "울진 라멘", "울릉 라멘",
    # 경남
    "창원 라멘", "진주 라멘", "통영 라멘", "사천 라멘", "김해 라멘",
    "밀양 라멘", "거제 라멘", "양산 라멘", "의령 라멘", "함안 라멘",
    "창녕 라멘", "고성 라멘 경남", "남해 라멘", "하동 라멘", "산청 라멘",
    "함양 라멘", "거창 라멘", "합천 라멘",
    # 제주
    "제주시 라멘", "서귀포시 라멘",
]

def is_ramen_shop(name, category):
    name_lower = name.lower()
    category_lower = category.lower()

    exclude_keywords = ["편의점", "마트", "슈퍼", "학교", "병원", "약국", "은행", "피자", "치킨", "카페", "베이커리", "떡볶이", "김밥"]
    for kw in exclude_keywords:
        if kw in name or kw in category:
            return False

    ramen_keywords = ["라멘", "라면", "라맨", "ramen", "ramyun", "拉麵", "拉麺"]
    for kw in ramen_keywords:
        if kw in name_lower or kw in category_lower:
            return True

    japanese_keywords = ["일식", "면", "돈코츠", "츠케멘", "소바", "우동", "라멘"]
    if any(j in category_lower for j in japanese_keywords):
        if any(k in name_lower for k in ["멘", "라멘", "돈코츠", "츠케", "소바", "하카타", "큐슈"]):
            return True

    return False

def search_kakao(query, page=1, size=15):
    params = {
        "query": query,
        "category_group_code": CATEGORY_GROUP_CODE,
        "page": page,
        "size": size,
    }
    try:
        resp = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=10)
        if resp.status_code != 200:
            print(f"Kakao API Error Code {resp.status_code}: {resp.text}", flush=True)
            return None
        return resp.json()
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def collect_all():
    all_shops = []
    seen_ids = set()
    total_queries = len(SEARCH_QUERIES)

    print(f"Starting nationwide ramen crawl ({total_queries} queries)...")

    for idx, query in enumerate(SEARCH_QUERIES, 1):
        page = 1
        query_shops = 0

        while page <= 3:
            data = search_kakao(query, page=page)
            if not data or "documents" not in data:
                break

            docs = data["documents"]
            if not docs:
                break

            for doc in docs:
                shop_id = doc.get("id", "")
                if shop_id in seen_ids:
                    continue
                seen_ids.add(shop_id)

                category = doc.get("category_name", "")
                name = doc.get("place_name", "")
                if not is_ramen_shop(name, category):
                    continue

                shop = {
                    "id": f"kakao_{shop_id}",
                    "name": name,
                    "address": doc.get("road_address_name") or doc.get("address_name", ""),
                    "jibun_address": doc.get("address_name", ""),
                    "lat": float(doc.get("y", 0)),
                    "lng": float(doc.get("x", 0)),
                    "phone": doc.get("phone", ""),
                    "category": category,
                    "place_url": doc.get("place_url", ""),
                    "source_query": query,
                }
                all_shops.append(shop)
                query_shops += 1

            meta = data.get("meta", {})
            total_count = meta.get("pageable_count", 0)
            if page * 15 >= total_count:
                break

            page += 1
            time.sleep(DELAY)

        if idx % 10 == 0 or idx == total_queries:
            print(f"[{idx}/{total_queries}] Progress... Total shops collected: {len(all_shops)}")
        time.sleep(DELAY)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_shops, f, ensure_ascii=False, indent=2)
    print(f"Collection complete! Total {len(all_shops)} shops saved to {OUTPUT_FILE}")

    return all_shops

if __name__ == "__main__":
    collect_all()
