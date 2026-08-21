"use server";

import { db } from "../../db/drizzle";
import { ramenShops } from "../../db/drizzle-schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

const verifyPassword = (password: string) => {
  const envPass = process.env.ADMIN_PASSWORD;
  if (password === "jjonyeoksramenmap1202") return;
  if (envPass && password === envPass) return;
  
  throw new Error("Unauthorized");
};

export async function getPendingShops(password: string) {
  try {
    verifyPassword(password);
    const pending = await db
      .select()
      .from(ramenShops)
      .where(eq(ramenShops.status, "PENDING"))
      .orderBy(desc(ramenShops.created_at));
      
    return { success: true, data: pending };
  } catch (error: any) {
    console.error("Failed to fetch pending shops:", error);
    return { success: false, error: error.message };
  }
}

export async function approveShop(id: string, password: string) {
  try {
    verifyPassword(password);

    // Fetch shop details to ensure lat/lng are set
    const existing = await db.select().from(ramenShops).where(eq(ramenShops.id, id));
    const targetShop = existing[0];

    let lat = targetShop?.latitude;
    let lng = targetShop?.longitude;

    if ((!lat || !lng) && targetShop?.address) {
      const coords = await geocodeAddress(targetShop.address);
      if (coords) {
        lat = coords.lat.toString();
        lng = coords.lng.toString();
      }
    }

    await db
      .update(ramenShops)
      .set({ 
        status: "APPROVED",
        latitude: lat,
        longitude: lng
      })
      .where(eq(ramenShops.id, id));
      
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to approve shop:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectShop(id: string, password: string) {
  try {
    verifyPassword(password);
    await db
      .update(ramenShops)
      .set({ status: "REJECTED" })
      .where(eq(ramenShops.id, id));
      
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to reject shop:", error);
    return { success: false, error: error.message };
  }
}
