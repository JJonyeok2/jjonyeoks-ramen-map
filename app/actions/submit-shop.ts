"use server";

import { db } from "../../db/drizzle";
import { ramenShops } from "../../db/drizzle-schema";

export async function submitRamenShop(formData: FormData) {
  try {
    const name = formData.get("name")?.toString();
    const address = formData.get("address")?.toString();
    const signature = formData.get("signature")?.toString();
    const priceStr = formData.get("price")?.toString();
    const brothStyle = formData.get("brothStyle")?.toString();

    if (!name || !address) {
      return { success: false, error: "이름과 주소는 필수입니다." };
    }

    const price = priceStr ? parseInt(priceStr, 10) : null;

    // Use geocoding or just store address (since latitude/longitude require an API call).
    // The user's schema supports latitude/longitude, but the current prototype form only asks for address.
    
    await db.insert(ramenShops).values({
      name,
      address,
      menu_type: signature,
      broth_style: brothStyle,
      price,
      status: "PENDING",
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit ramen shop:", error);
    return { success: false, error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }
}
