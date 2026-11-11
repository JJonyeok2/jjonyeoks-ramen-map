# -*- coding: utf-8 -*-
"""
app/ramen-data.ts 의 매장을 카카오 로컬 키워드 검색과 대조한다.

  KAKAO_REST_API_KEY=... python scripts/verify_shops_kakao.py            # 리포트만
  KAKAO_REST_API_KEY=... python scripts/verify_shops_kakao.py --apply    # 매칭된 매장 반영
  ... --all          # crawled-* 포함 전체 검사 (기본은 unverified 만)

결과
  scripts/kakao_verify_report.json  매장별 판정(matched / not_found)과 후보
  --apply 시 matched 매장의 주소, 좌표, 구, source_url 을 카카오 값으로 덮어쓰고
  dataStatus 를 verified 로 올린다. not_found 는 건드리지 않는다(삭제는 사람이 판단).
"""
import argparse
import datetime
import json
import math
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "ramen-data.ts"
REPORT = ROOT / "scripts" / "kakao_verify_report.json"
MARK = "export const RAMEN_SHOPS: RamenShop[] = "
URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

# 같은 가게로 볼 최대 거리. 직접 입력한 좌표는 수백 m 어긋난 경우가 많아 넉넉하게 둔다.
MAX_DISTANCE_M = 3000
FOOD_CATEGORY = "FD6"


def load_shops():
    src = DATA.read_text(encoding="utf-8")
    i = src.index(MARK) + len(MARK)
    j = src.rindex("];") + 1
    return src, i, j, json.loads(src[i:j])


def save_shops(src, i, j, shops):
    DATA.write_text(src[:i] + json.dumps(shops, ensure_ascii=False, indent=2) + src[j:], encoding="utf-8")


def core_name(name):
    """'멘야준 (서교)' -> '멘야준', '칸다소바 홍대점' -> '칸다소바'."""
    name = re.sub(r"\(.*?\)", " ", name)
    name = re.sub(r"\S+점$", " ", name.strip())
    return re.sub(r"\s+", " ", name).strip()


def norm(text):
    text = unicodedata.normalize("NFC", text).lower()
    return re.sub(r"[\s\-·()\[\]]|본점|지점|라멘|라면|ramen", "", text)


def name_score(ours, theirs):
    a, b = norm(core_name(ours)), norm(theirs)
    if not a or not b:
        return 0.0
    if a in b or b in a:
        return 1.0
    # 글자 bigram Dice 계수
    grams = lambda s: {s[k:k + 2] for k in range(len(s) - 1)} or {s}
    ga, gb = grams(a), grams(b)
    return 2 * len(ga & gb) / (len(ga) + len(gb))


def distance_m(lat1, lng1, lat2, lng2):
    dy = (lat2 - lat1) * 111_000
    dx = (lng2 - lng1) * 111_000 * math.cos(math.radians(lat1))
    return math.hypot(dx, dy)


def district_of(address):
    """'서울 마포구 ...' -> '마포구', '경기 성남시 분당구 ...' -> '성남시 분당구'."""
    parts = address.split()
    units = [p for p in parts[1:3] if re.search(r"(구|시|군)$", p)]
    if units and units[0].endswith("시") and len(units) == 1:
        return units[0]
    if len(units) == 2 and not units[1].endswith("구"):
        units = units[:1]
    return " ".join(units) or (parts[1] if len(parts) > 1 else "")


def search(session, query, shop):
    params = {
        "query": query,
        "category_group_code": FOOD_CATEGORY,
        "x": shop["lng"],
        "y": shop["lat"],
        "radius": 20000,
        "sort": "accuracy",
        "size": 15,
    }
    resp = session.get(URL, params=params, timeout=10)
    if resp.status_code == 401:
        sys.exit("카카오 키가 거부되었습니다. KAKAO_REST_API_KEY 를 확인하세요.")
    resp.raise_for_status()
    return resp.json().get("documents", [])


def best_match(shop, documents):
    ranked = []
    for doc in documents:
        score = name_score(shop["name"], doc["place_name"])
        dist = distance_m(shop["lat"], shop["lng"], float(doc["y"]), float(doc["x"]))
        if score >= 0.6 and dist <= MAX_DISTANCE_M:
            ranked.append((score, -dist, doc, dist))
    if not ranked:
        return None, None
    ranked.sort(key=lambda r: (r[0], r[1]), reverse=True)
    return ranked[0][2], ranked[0][3]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="matched 결과를 ramen-data.ts 에 반영")
    parser.add_argument("--all", action="store_true", help="unverified 뿐 아니라 전체 매장 검사")
    args = parser.parse_args()

    key = os.environ.get("KAKAO_REST_API_KEY")
    if not key:
        sys.exit("KAKAO_REST_API_KEY 환경변수가 필요합니다 (카카오 디벨로퍼스 > 앱 키 > REST API 키).")

    src, i, j, shops = load_shops()
    targets = [s for s in shops if args.all or s.get("dataStatus") != "verified"]
    print(f"검사 대상 {len(targets)} / 전체 {len(shops)}")

    session = requests.Session()
    session.headers["Authorization"] = f"KakaoAK {key}"
    month = datetime.date.today().strftime("%Y-%m")
    report = []

    for n, shop in enumerate(targets, 1):
        query = f"{core_name(shop['name'])} {shop['region']}"
        doc, dist = best_match(shop, search(session, query, shop))
        if doc is None:
            # 지역명을 빼고 한 번 더 (지점명이 지역과 다른 경우)
            doc, dist = best_match(shop, search(session, core_name(shop["name"]), shop))

        entry = {"id": shop["id"], "name": shop["name"], "address": shop["address"]}
        if doc is None:
            entry["result"] = "not_found"
        else:
            new_address = doc["road_address_name"] or doc["address_name"]
            entry.update(
                result="matched",
                kakao_name=doc["place_name"],
                kakao_address=new_address,
                moved_m=round(dist),
                address_changed=new_address != shop["address"],
                place_url=doc["place_url"],
            )
            if args.apply:
                shop.update(
                    address=new_address,
                    district=district_of(new_address) or shop["district"],
                    lat=float(doc["y"]),
                    lng=float(doc["x"]),
                    source_url=doc["place_url"],
                    dataStatus="verified",
                    verifiedAt=month,
                )
        report.append(entry)
        print(f"[{n}/{len(targets)}] {entry['result']:9} {shop['name']}"
              + (f" -> {entry['kakao_name']} ({entry['moved_m']}m)" if doc else ""))
        time.sleep(0.15)

    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    matched = sum(r["result"] == "matched" for r in report)
    print(f"\nmatched {matched}, not_found {len(report) - matched} -> {REPORT.relative_to(ROOT)}")

    if args.apply:
        save_shops(src, i, j, shops)
        print("ramen-data.ts 반영 완료")


if __name__ == "__main__":
    main()
