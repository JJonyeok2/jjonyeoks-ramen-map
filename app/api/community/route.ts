import { NextResponse } from "next/server";
import { db } from "../../../db/drizzle";
import { ramenShops } from "../../../db/drizzle-schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const approvedShops = await db
      .select()
      .from(ramenShops)
      .where(eq(ramenShops.status, "APPROVED"));

    // DB 모델(ramenShops)과 기존 프론트엔드 모델(RamenShop)의 형식을 맞춰줍니다.
    const formattedShops = approvedShops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      address: shop.address || "주소 미상",
      region: "커뮤니티",
      district: "등록",
      lat: shop.latitude ? parseFloat(shop.latitude) : 37.5,
      lng: shop.longitude ? parseFloat(shop.longitude) : 126.9,
      types: shop.menu_type ? [shop.menu_type] : [],
      brothStyle: shop.broth_style || "chintan",
      signature: shop.menu_type || "",
      price: shop.price || 0,
      body: 3,
      spiciness: 0,
      bases: [],
      tags: ["커뮤니티제보"],
      rating: 0,
      hours: "커뮤니티 데이터",
      closed: "알수없음",
      vegetarian: false,
      containsPork: true,
      dataStatus: "verified" // 화면에서 '검증' 카운트에 합산되게 하거나 그냥 둡니다.
    }));

    return NextResponse.json(formattedShops);
  } catch (err) {
    console.error("Failed to fetch community data from DB:", err);
    return NextResponse.json([]);
  }
}

