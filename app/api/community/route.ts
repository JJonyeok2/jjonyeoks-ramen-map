import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "community-data.json");

export async function GET() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return NextResponse.json([]);
    }
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (err) {
    console.error("Failed to read community data", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 주소를 통한 임시 좌표(더미 로직) - 실제로는 카카오/네이버 지오코딩 연동 필요
    // 프로토타입 단계에서는 서울 중심 좌표를 주거나 랜덤하게 부여
    const lat = 37.5 + (Math.random() * 0.1 - 0.05);
    const lng = 126.9 + (Math.random() * 0.1 - 0.05);

    const newShop = {
      id: `comm-${Date.now()}`,
      name: body.name || "이름 없는 라멘집",
      address: body.address || "주소 미상",
      region: "커뮤니티",
      district: "등록",
      lat,
      lng,
      types: body.types || [],
      brothStyle: body.brothStyle || "chintan",
      signature: body.signature || "",
      price: body.price ? parseInt(body.price, 10) : 0,
      body: 3,
      spiciness: 0,
      bases: [],
      tags: ["커뮤니티제보"],
      rating: 0,
      hours: "커뮤니티 데이터",
      closed: "알수없음",
      vegetarian: false,
      containsPork: true,
      description: body.description || ""
    };

    let existingData: any[] = [];
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
      try {
        existingData = JSON.parse(fileContent);
      } catch (e) {
        // ignore parse error
      }
    }

    existingData.push(newShop);
    fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2), "utf-8");

    return NextResponse.json({ success: true, shop: newShop });
  } catch (err) {
    console.error("Failed to save community data", err);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
