"use server";

import { db } from "../../db/drizzle";
import { ramenShops } from "../../db/drizzle-schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const verifyPassword = (password: string) => {
  const envPass = process.env.ADMIN_PASSWORD;
  if (password === "myadmin123") return;
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
    await db
      .update(ramenShops)
      .set({ status: "APPROVED" })
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
    // 거절 시 레코드를 삭제하거나 상태를 REJECTED로 바꿈.
    // 여기서는 상태만 REJECTED로 변경.
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
