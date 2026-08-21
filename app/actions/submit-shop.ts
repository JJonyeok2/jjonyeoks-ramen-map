"use server";

import { db } from "../../db/drizzle";
import { ramenShops } from "../../db/drizzle-schema";

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=ko`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status === "OK" && data.results && data.results[0]) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
  } catch (error) {
    console.error("Geocoding failed:", error);
  }
  return null;
}

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

    if (name.length > 50 || address.length > 150) {
      return { success: false, error: "상호명이나 주소가 너무 깁니다." };
    }

    const price = priceStr ? parseInt(priceStr, 10) : null;

    // Auto Geocode address to fetch exact lat/lng
    const coords = await geocodeAddress(address);

    await db.insert(ramenShops).values({
      name,
      address,
      latitude: coords ? coords.lat.toString() : null,
      longitude: coords ? coords.lng.toString() : null,
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
