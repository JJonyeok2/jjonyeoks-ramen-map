#!/usr/bin/env python3
"""
카카오 검색 API (Web/Blog) 기반 전국 라멘 전문점 크롤러
"""

import requests
import json
import re
import time

KAKAO_API_KEY = "e3648ffb9d5d72ff0ae1d65a046a2aaa"
HEADERS = {"Authorization": f"KakaoAK {KAKAO_API_KEY}"}

SEARCH_TARGETS = [
    # 서울/경기 라멘성지
    "홍대 라멘 본점 주소", "합정 라멘 본점 주소", "연남동 라멘 본점 주소", "혜화 라멘 본점 주소",
    "강남 라멘 수제 주소", "성수 라멘 수제 주소", "송리단길 라멘 주소", "신촌 라멘 본점 주소",
    "수원 라멘 수제 주소", "일산 라멘 수제 주소", "부천 라멘 수제 주소", "분당 라멘 수제 주소",
    # 전국 광역시/8도 라멘성지
    "부산 라멘 본점 주소", "전포 라멘 수제 주소", "대구 라멘 본점 주소", "동성로 라멘 수제 주소",
    "대전 라멘 수제 주소", "광주 라멘 수제 주소", "인천 라멘 수제 주소", "울산 라멘 수제 주소",
    "제주 라멘 수제 주소", "강릉 라멘 수제 주소", "전주 라멘 수제 주소", "창원 라멘 수제 주소"
]

def search_kakao_blog(query):
    url = "https://dapi.kakao.com/v2/search/blog"
    params = {"query": query, "size": 10}
    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("documents", [])
    except Exception as e:
        print(f"Error searching {query}: {e}")
    return []

def search_kakao_web(query):
    url = "https://dapi.kakao.com/v2/search/web"
    params = {"query": query, "size": 10}
    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("documents", [])
    except Exception as e:
        print(f"Error searching {query}: {e}")
    return []

def main():
    print("Starting Kakao Web/Blog API Crawler...")
    all_results = []
    
    for idx, q in enumerate(SEARCH_TARGETS, 1):
        blog_docs = search_kakao_blog(q)
        web_docs = search_kakao_web(q)
        
        for doc in blog_docs + web_docs:
            title = doc.get("title", "").replace("<b>", "").replace("</b>", "")
            contents = doc.get("contents", "").replace("<b>", "").replace("</b>", "")
            url = doc.get("url", "")
            all_results.append({"query": q, "title": title, "contents": contents, "url": url})
            
        time.sleep(0.1)

    print(f"Collected {len(all_results)} search documents via Kakao API.")
    with open("kakao_web_crawled_raw.json", "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
