import { NextResponse } from "next/server";
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

const BROTH_MAP: Record<string, string> = {
  chintan: "맑은청탕",
  paitan: "진한백탕",
  tsukemen: "츠케멘",
  mazesoba: "마제소바",
  jiro: "지로계열",
  tori_paitan: "토리파이탄",
  miso: "미소라멘",
  shoyu: "쇼유라멘",
  shio: "시오라멘",
  spicy: "매운라멘"
};

export async function GET() {
  try {
    const approvedShops = await db
      .select()
      .from(ramenShops)
      .where(eq(ramenShops.status, "APPROVED"));

    const formattedShops = approvedShops.map((shop) => {
      const { region, district } = parseRegionAndDistrict(shop.address || "");
      const brothTag = BROTH_MAP[shop.broth_style || "chintan"] || "청탕";
      const menuTag = shop.menu_type || "수제라멘";

      return {
        id: shop.id,
        name: shop.name,
        address: shop.address || "주소 미상",
        region,
        district,
        lat: shop.latitude ? parseFloat(shop.latitude) : 37.5,
        lng: shop.longitude ? parseFloat(shop.longitude) : 126.9,
        types: shop.menu_type ? [shop.menu_type as any] : ["shio"],
        brothStyle: shop.broth_style || "chintan",
        signature: shop.menu_type || "대표 라멘",
        price: shop.price || 0,
        body: 3,
        spiciness: 0,
        bases: ["돼지", "닭"],
        tags: [menuTag, brothTag],
        rating: 4.8,
        hours: "영업시간 정보 없음",
        closed: "매주 휴무 문의",
        vegetarian: false,
        containsPork: true,
        dataStatus: "verified" as const
      };
    });

    return NextResponse.json(formattedShops);
  } catch (err) {
    console.error("Failed to fetch community data from DB:", err);
    return NextResponse.json([]);
  }
}
