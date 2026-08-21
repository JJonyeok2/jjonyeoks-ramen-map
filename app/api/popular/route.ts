import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { RAMEN_SHOPS } from "@/app/ramen-data";

export async function GET() {
  try {
    // Get Top 5 shops with scores from Redis Sorted Set
    const rawResult = await redis.zrevrange("popular_shops", 0, 4, { withScores: true });
    
    // Parse result: Upstash returns [id1, score1, id2, score2, ...] or [{member, score}, ...]
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

    // Attach shop data
    const results = popularList
      .map((item) => {
        const shop = RAMEN_SHOPS.find((s) => s.id === item.id);
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

    // Increment click score by 1 in Redis sorted set "popular_shops"
    const newScore = await redis.zincrby("popular_shops", 1, shopId);

    return NextResponse.json({ success: true, shopId, score: newScore });
  } catch (error: any) {
    console.error("Failed to track shop click in Redis:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
