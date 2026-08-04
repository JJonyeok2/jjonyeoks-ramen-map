#!/usr/bin/env python3
"""
라멘집 데이터 정제 파이프라인
"""

import json
import re
import argparse
from collections import Counter
from difflib import SequenceMatcher

CHAIN_THRESHOLD = 5
DUPLICATE_SIMILARITY = 0.85

def extract_brand(name):
    n = re.sub(r'\s*\([^)]*\)', '', name)
    n = re.sub(r'\s*본점', '', n)
    n = re.sub(r'\s*직영점', '', n)
    tokens = n.split()
    if tokens and tokens[-1].endswith('점'):
        tokens = tokens[:-1]
    return ' '.join(tokens).strip()

def extract_region(address):
    patterns = [
        r'(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|제주특별자치도|강원특별자치도|경기도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도)\s*(.+?)(?:구|군|시)',
        r'(서울|부산|대구|인천|광주|대전|울산|세종|제주|강원|경기|충북|충남|전북|전남|경북|경남)',
    ]

    region_map = {
        "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
        "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전",
        "울산광역시": "울산", "세종특별자치시": "세종", "제주특별자치도": "제주",
        "강원특별자치도": "강원", "경기도": "경기", "충청북도": "충북",
        "충청남도": "충남", "전라북도": "전북", "전라남도": "전남",
        "경상북도": "경북", "경상남도": "경남",
    }

    for p in patterns:
        m = re.search(p, address)
        if m:
            region = region_map.get(m.group(1), m.group(1))
            district_match = re.search(r'(?:구|군|시)\s*([^\s]+(?:구|군))', address)
            district = district_match.group(1) if district_match else m.group(2) if len(m.groups()) > 1 else ""
            return region, district

    return "기타", ""

def infer_broth_style(name, category):
    name_c = name.lower()
    cat_c = category.lower()

    if any(k in name_c for k in ["츠케멘", "つけ麺", "tsukemen"]):
        return "dipping"
    if any(k in name_c for k in ["마제소바", "아부라", "비빔", "mazesoba", "abura"]):
        return "dry"
    if any(k in name_c + cat_c for k in ["시오", "쇼유", "청탕", "간장", "소금", "shio", "shoyu"]):
        return "chintan"
    return "paitan"

def infer_types(name, category):
    types = []
    n = name.lower()
    c = category.lower()

    if any(k in n for k in ["돈코츠", "돈꼬츠", "tonkotsu", "하카다"]):
        types.append("tonkotsu")
    if any(k in n + c for k in ["시오", "소금", "shio"]):
        types.append("shio")
    if any(k in n + c for k in ["쇼유", "간장", "shoyu"]):
        types.append("shoyu")
    if any(k in n + c for k in ["미소", "된장", "miso"]):
        types.append("miso")
    if any(k in n for k in ["츠케멘", "tsukemen"]):
        types.append("tsukemen")
    if any(k in n for k in ["마제소바", "mazesoba"]):
        types.append("mazesoba")
    if any(k in n for k in ["지로", "jiro"]):
        types.append("jiro")

    if not types:
        types.append("tonkotsu")
    return types

def infer_bases(broth_style, name):
    n = name.lower()
    if broth_style == "chintan":
        if any(k in n for k in ["카모", "오리", "duck"]):
            return ["오리"]
        if any(k in n for k in ["해산물", "해물", "seafood", "fish"]):
            return ["해산물"]
        return ["닭", "해산물"]
    if any(k in n for k in ["토리", "닭", "chicken", "tori"]):
        return ["닭"]
    return ["돼지"]

def auto_tag(name, types, broth_style, price, category):
    body = 4 if broth_style == "paitan" else 2
    spiciness = 1 if any(k in name.lower() for k in ["카라이", "매운", "spicy", "karai"]) else 0

    richness = "heavy" if body >= 4 else "medium" if body >= 2 else "light"
    oil = "high" if body >= 4 else "medium" if body >= 2 else "low"

    if "tsukemen" in types:
        noodle = "극태면"
    elif broth_style == "chintan":
        noodle = "자가제면 직면"
    else:
        noodle = "세면"

    if price <= 9000:
        pr = "8000-10000"
    elif price <= 11000:
        pr = "10000-13000"
    else:
        pr = "13000-16000"

    bases = infer_bases(broth_style, name)

    detailedTags = {
        "broth": bases,
        "richness": richness,
        "oil_level": oil,
        "spiciness": spiciness,
        "noodle_type": noodle,
        "topping_special": ["차슈", "아지타마고"],
        "price_range": pr,
        "waiting": "medium",
        "mood": ["혼밥", "감성"] if broth_style == "chintan" else ["혼밥", "가성비"],
        "recommend_for": ["혼밥"] + (["데이트"] if broth_style == "chintan" else [])
    }

    aiProfile = {
        "stress_relief": round(0.5 + (body / 10), 2),
        "hangover_cure": round(0.5 + (body / 10), 2) if "돼지" in bases else round(0.7 + (body / 20), 2),
        "cleanse_palate": round(1.0 - (body / 5), 2),
        "spicy_challenge": round(spiciness / 5, 2),
        "solo_friendly": 0.9,
        "date_spot": 0.8 if broth_style == "chintan" else 0.7
    }

    return detailedTags, aiProfile

def deduplicate(shops):
    unique = []
    seen = []

    for shop in shops:
        name = shop.get("name", "")
        addr = shop.get("address", "")
        is_dup = False

        for u in seen:
            if u["name"] == name:
                sim = SequenceMatcher(None, u["address"], addr).ratio()
                if sim >= DUPLICATE_SIMILARITY:
                    is_dup = True
                    break

        if not is_dup:
            unique.append(shop)
            seen.append({"name": name, "address": addr})

    print(f"   중복 제거: {len(shops)} → {len(unique)}개")
    return unique

def filter_chain(shops):
    brands = Counter(extract_brand(s["name"]) for s in shops)
    chain_brands = {b for b, c in brands.items() if c >= CHAIN_THRESHOLD and len(b) > 1}

    print(f"   체인 브랜드 ({CHAIN_THRESHOLD}개 이상 제외): {sorted(chain_brands)}")
    filtered = [s for s in shops if extract_brand(s["name"]) not in chain_brands]
    print(f"   체인 제거: {len(shops)} → {len(filtered)}개")
    return filtered

def transform_to_schema(shop, idx):
    name = shop.get("name", "")
    address = shop.get("address", "") or shop.get("jibun_address", "")
    region, district = extract_region(address)

    types = infer_types(name, shop.get("category", ""))
    broth_style = infer_broth_style(name, shop.get("category", ""))

    price = 10000
    menu_list = shop.get("menu_list", []) or shop.get("menuList", [])
    if menu_list:
        prices = []
        for m in menu_list:
            p_str = str(m.get("price", ""))
            nums = re.findall(r"[0-9,]+", p_str)
            if nums:
                prices.append(int(nums[0].replace(",", "")))
        if prices:
            price = int(sum(prices) / len(prices))

    detailedTags, aiProfile = auto_tag(name, types, broth_style, price, shop.get("category", ""))

    final_menu = [
        {
            "name": name + " 대표 라멘",
            "price": price,
            "isSignature": True,
            "brothStyle": broth_style,
            "spiciness": detailedTags["spiciness"],
            "description": "수제 정성 대표 라멘"
        }
    ]

    region_code = region.lower()[:3]
    shop_id = f"crawled-{region_code}-{idx:04d}"

    return {
        "id": shop_id,
        "name": name,
        "region": region,
        "district": district,
        "address": address,
        "lat": shop.get("lat", 0.0),
        "lng": shop.get("lng", 0.0),
        "types": types,
        "brothStyle": broth_style,
        "signature": final_menu[0]["name"],
        "price": price,
        "body": 4 if broth_style == "paitan" else 2,
        "spiciness": detailedTags["spiciness"],
        "bases": detailedTags["broth"],
        "tags": [region + "라멘", (district or region) + "맛집", types[0], "혼밥"],
        "rating": 4.6,
        "hours": "11:30-21:00",
        "closed": "연중무휴",
        "vegetarian": False,
        "containsPork": "돼지" in detailedTags["broth"],
        "menuList": final_menu,
        "detailedTags": detailedTags,
        "aiProfile": aiProfile,
        "dataStatus": "crawled",
        "verifiedAt": "2026-08",
        "source_url": shop.get("place_url", "")
    }

def main():
    parser = argparse.ArgumentParser(description="라멘집 데이터 정제 파이프라인")
    parser.add_argument("--input", default="kakao_raw_ramen.json", help="입력 JSON 파일")
    parser.add_argument("--output", default="ramen_shops_final.json", help="출력 JSON 파일")
    parser.add_argument("--keep-chain", action="store_true", help="체인점 유지")
    args = parser.parse_args()

    print("🍜 데이터 정제 파이프라인 시작")

    with open(args.input, "r", encoding="utf-8") as f:
        raw = json.load(f)
    print(f"1️⃣ 로드 완료: {len(raw)}개")

    deduped = deduplicate(raw)

    if args.keep_chain:
        filtered = deduped
    else:
        filtered = filter_chain(deduped)

    final = [transform_to_schema(s, i) for i, s in enumerate(filtered, 1)]

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    regions = Counter(s["region"] for s in final)
    print(f"✅ 정제 완료! 총 {len(final)}개 라멘집 -> {args.output}")
    print("📊 지역별 분포:")
    for r, c in regions.most_common():
        print(f"   {r}: {c}개")

if __name__ == "__main__":
    main()
