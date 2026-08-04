#!/usr/bin/env python3
"""
478개 카카오 수집 문서에서 라멘 전문점 추출 및 파싱
"""

import json
import re
from collections import Counter

def main():
    with open("kakao_web_crawled_raw.json", "r", encoding="utf-8") as f:
        docs = json.load(f)

    extracted_shops = []
    seen_names = set()

    for d in docs:
        text = d["title"] + " " + d["contents"]
        # 매장명 패턴 추출 (예: 멘야XX, 라멘XX, XX라멘, XX소바)
        shop_matches = re.findall(r'([가-힣A-Za-z0-9]+(?:라멘|멘야|소바|츠케멘|지로))', text)
        for name in shop_matches:
            if len(name) < 2 or name in ["일본라멘", "수제라멘", "맛집라멘", "인생라멘", "인기라멘", "추천라멘"]:
                continue
            if name not in seen_names:
                seen_names.add(name)
                extracted_shops.append({
                    "name": name,
                    "query": d["query"],
                    "sample_text": text[:150]
                })

    print(f"Extracted {len(extracted_shops)} unique ramen shop mentions from Kakao API search documents.")
    with open("parsed_kakao_shops.json", "w", encoding="utf-8") as f:
        json.dump(extracted_shops, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
