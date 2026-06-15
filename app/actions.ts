"use server";

import { revalidatePath } from "next/cache";
import * as db from "@/lib/db";

export async function addCompetitorAction(formData: FormData) {
  const shopId = Number(formData.get("shop_id"));
  const name = String(formData.get("name") ?? "").trim();
  const fb = String(formData.get("facebook_page_id") ?? "").trim();
  if (shopId && name && fb) db.addCompetitor(shopId, name, fb);
  revalidatePath("/concurrents");
}

export async function toggleCompetitorAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  if (id) db.setCompetitorActive(id, !active);
  revalidatePath("/concurrents");
}

export async function deleteCompetitorAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (id) db.deleteCompetitor(id);
  revalidatePath("/concurrents");
}

export async function addShopAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (name) db.addShop(name);
  revalidatePath("/boutiques");
}

export async function toggleSuiviAction(formData: FormData) {
  const shopId = Number(formData.get("shop_id"));
  const adId = String(formData.get("ad_id"));
  if (shopId && adId) db.toggleSuivi(shopId, adId);
  revalidatePath("/");
}
