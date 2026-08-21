import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { RAMEN_SHOPS } from "@/app/ramen-data";
import { db } from "../../../db/drizzle";
import { ramenShops } from "../../../db/drizzle-schema";
import { eq } from "drizzle-orm";

function parseRegionAndDistrict(address: string) {
  if (!address) return { region: "서울", district: "" };

  let region: string = "서울";
  if (address.includes("서울")) region = "서울";
  else if (address.includes("부산")) region = "부산";
  else if (address.includes("대구")) region = "대구";
  else if (address.includes("인천")) region = "인천";
  else if (address.includes("광주")) region = "광주";
  else if (address.includes("대전")) region = "대전";
  else if (address.includes("울산")) region = "울산";
  else if (address.includes("세종")) region = "세종";
  else if (address.includes("경기")) region = "경기";
  else if (address.includes("강원")) region = "강원";
  else if (address.includes("충북") || address.includes("충청북도")) region = "충북";
  else if (address.includes("충남") || address.includes("충청남도")) region = "충남";
  else if (address.includes("전북") || address.includes("전라북도")) region = "전북";
  else if (address.includes("전남") || address.includes("전라남도")) region = "전남";
  else if (address.includes("경북") || address.includes("경상북도")) region = "경북";
  else if (address.includes("경남") || address.includes("경상남도")) region = "경남";
  else if (address.includes("제주")) region = "제주";

  const parts = address.trim().split(/\s+/);
  let district = parts[1] || "";
  if (district === region || district.length > 10) {
    district = parts[2] || "";
  }

  return { region, district };
}

export async function GET() {
  try {
    const rawResult = await redis.zrevrange("popular_shops", 0, 4, { withScores: true });
    
    const popularList: { id: string; clicks: number }[] = [];

    if (Array.isArray(rawResult)) {
      for (let i = 0; i < rawResult.length; i += 2) {
        const id = String(rawResult[i]);
        const clicks = Number(rawResult[i + 1] || 0);
        if (id) {
          popularList.push({ id, clicks });
        }
      }
    }

    let communityShops: any[] = [];
    try {
      const approved = await db.select().from(ramenShops).where(eq(ramenShops.status, "APPROVED"));
      communityShops = approved.map((shop) => {
        const { region, district } = parseRegionAndDistrict(shop.address || "");
        return {
          id: shop.id,
          name: shop.name,
          address: shop.address || "주소 미상",
          region,
          district,
          lat: shop.latitude ? parseFloat(shop.latitude) : 37.5,
          lng: shop.longitude ? parseFloat(shop.longitude) : 126.9,
          types: shop.menu_type ? [shop.menu_type] : ["shio"],
          brothStyle: shop.broth_style || "chintan",
          signature: shop.menu_type || "대표 라멘",
          price: shop.price || 0,
          body: 3,
          spiciness: 0,
          bases: ["돼지"],
          tags: [shop.menu_type || "수제라멘"],
          rating: 4.8,
          hours: "영업시간 정보 없음",
          closed: "매주 휴무 문의",
          vegetarian: false,
          containsPork: true,
          dataStatus: "verified"
        };
      });
    } catch (e) {
      console.error("Failed to fetch community shops for popular list", e);
    }

    const allShops = [...RAMEN_SHOPS, ...communityShops];

    const results = popularList
      .map((item) => {
        const shop = allShops.find((s) => s.id === item.id);
        return shop ? { ...shop, clicks: item.clicks } : null;
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, popular: results });
  } catch (error: any) {
    console.error("Failed to fetch popular shops from Redis:", error);
    return NextResponse.json({ success: false, popular: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { shopId } = await request.json();

    if (!shopId || typeof shopId !== "string") {
      return NextResponse.json({ success: false, error: "Invalid shopId" }, { status: 400 });
    }

    const newScore = await redis.zincrby("popular_shops", 1, shopId);

    return NextResponse.json({ success: true, shopId, score: newScore });
  } catch (error: any) {
    console.error("Failed to track shop click in Redis:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
