"use server";

import { revalidatePath } from "next/cache";
import * as db from "@/lib/db";
import { runScan } from "@/lib/scan";

// Bouton "Actualiser" du dashboard : relance le scan Meta puis rafraichit la page.
export async function refreshAction(formData: FormData) {
  const shopId = Number(formData.get("shop_id"));
  if (shopId) {
    await runScan(shopId);
    revalidatePath("/");
  }
}

// Modifie le seuil de spend (€) depuis le dashboard, puis re-scanne avec le nouveau seuil.
export async function setFloorAction(formData: FormData) {
  const shopId = Number(formData.get("shop_id"));
  const floor = Math.max(0, Math.round(Number(formData.get("floor_eur"))));
  if (shopId && Number.isFinite(floor)) {
    await db.setShopFloor(shopId, floor);
    await runScan(shopId); // applique le nouveau seuil tout de suite (ajoute/retire les pubs)
    revalidatePath("/");
  }
}

export async function addCompetitorAction(formData: FormData) {
  const shopId = Number(formData.get("shop_id"));
  const name = String(formData.get("name") ?? "").trim();
  const fb = String(formData.get("facebook_page_id") ?? "").trim();
  if (shopId && name && fb) await db.addCompetitor(shopId, name, fb);
  revalidatePath("/concurrents");
}

export async function toggleCompetitorAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  if (id) await db.setCompetitorActive(id, !active);
  revalidatePath("/concurrents");
}

export async function deleteCompetitorAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (id) await db.deleteCompetitor(id);
  revalidatePath("/concurrents");
}

export async function addShopAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (name) await db.addShop(name);
  revalidatePath("/boutiques");
}

export async function toggleSuiviAction(formData: FormData) {
  const shopId = Number(formData.get("shop_id"));
  const adId = String(formData.get("ad_id"));
  if (shopId && adId) await db.toggleSuivi(shopId, adId);
  revalidatePath("/");
}
