import type { Ad, Competitor, Shop } from "./types";
import { sb } from "./supabase";

export { isConfigured } from "./supabase";

/**
 * Couche d'acces aux donnees, adossee a Supabase (Postgres).
 * Toutes les fonctions sont async. Si Supabase n'est pas configure (avant le setup),
 * les lectures renvoient du vide et les ecritures sont des no-op : l'app reste affichable.
 */

// ---- shops ----
export async function listShops(): Promise<Shop[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c.from("shops").select("*").order("id");
  return (data ?? []) as Shop[];
}
export async function getShop(id: number): Promise<Shop | undefined> {
  const c = sb();
  if (!c) return undefined;
  const { data } = await c.from("shops").select("*").eq("id", id).maybeSingle();
  return (data ?? undefined) as Shop | undefined;
}
export async function addShop(name: string): Promise<Shop | undefined> {
  const c = sb();
  if (!c) return undefined;
  const { data } = await c.from("shops").insert({ name }).select().single();
  return data as Shop;
}
export async function setShopFloor(id: number, floorEur: number): Promise<void> {
  const c = sb();
  if (!c) return;
  await c.from("shops").update({ floor_eur: floorEur }).eq("id", id);
}
/** Supprime les pubs sous le seuil (rend le seuil autoritaire quand on le remonte). */
export async function pruneAdsBelowFloor(shopId: number, floorEur: number): Promise<void> {
  const c = sb();
  if (!c) return;
  await c.from("ads").delete().eq("shop_id", shopId).lt("spend_estime_eur", floorEur);
}

// ---- competitors ----
export async function listCompetitors(shopId: number): Promise<Competitor[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c.from("competitors").select("*").eq("shop_id", shopId).order("id");
  return (data ?? []) as Competitor[];
}
export async function listActiveCompetitors(shopId: number): Promise<Competitor[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c
    .from("competitors")
    .select("*")
    .eq("shop_id", shopId)
    .eq("active", true)
    .order("id");
  return (data ?? []) as Competitor[];
}
export async function addCompetitor(
  shopId: number,
  name: string,
  fbPageId: string,
  note?: string,
): Promise<void> {
  const c = sb();
  if (!c) return;
  await c.from("competitors").insert({
    shop_id: shopId,
    name,
    facebook_page_id: fbPageId,
    active: true,
    note: note ?? null,
  });
}
export async function setCompetitorActive(id: number, active: boolean): Promise<void> {
  const c = sb();
  if (!c) return;
  await c.from("competitors").update({ active }).eq("id", id);
}
export async function deleteCompetitor(id: number): Promise<void> {
  const c = sb();
  if (!c) return;
  await c.from("competitors").delete().eq("id", id);
}

// ---- ads ----
export async function listAds(shopId: number): Promise<Ad[]> {
  const c = sb();
  if (!c) return [];
  const { data } = await c.from("ads").select("*").eq("shop_id", shopId);
  return (data ?? []) as Ad[];
}
export async function toggleSuivi(shopId: number, adId: string): Promise<void> {
  const c = sb();
  if (!c) return;
  const { data } = await c
    .from("ads")
    .select("suivi")
    .eq("shop_id", shopId)
    .eq("ad_id", adId)
    .maybeSingle();
  if (!data) return;
  await c.from("ads").update({ suivi: !data.suivi }).eq("shop_id", shopId).eq("ad_id", adId);
}
export async function lastUpdated(shopId: number): Promise<string | null> {
  const c = sb();
  if (!c) return null;
  const { data } = await c
    .from("ads")
    .select("updated_at")
    .eq("shop_id", shopId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.updated_at ?? null;
}

export interface AdInput {
  competitor: string;
  ad_id: string | number;
  ad_url?: string;
  spend_estime_eur: number;
  spend_jour_eur: number;
  jours_diffusion: number;
  reach?: number | null;
  first_seen?: string | null;
}

/** Upsert d'un lot de pubs sur la cle (shop_id, ad_id). Reporte le spend/jour precedent. */
export async function upsertAds(shopId: number, rows: AdInput[]): Promise<number> {
  const c = sb();
  if (!c || rows.length === 0) return 0;
  const now = new Date().toISOString();

  // On relit l'etat actuel pour reporter prev_spend_jour_eur sur les pubs existantes.
  const { data: existingRows } = await c
    .from("ads")
    .select("ad_id, spend_jour_eur")
    .eq("shop_id", shopId);
  const prevByAd = new Map<string, number>(
    (existingRows ?? []).map((a) => [String(a.ad_id), a.spend_jour_eur as number]),
  );

  const payload = rows.map((row) => {
    const adId = String(row.ad_id);
    const known = prevByAd.get(adId);
    return {
      shop_id: shopId,
      competitor: row.competitor,
      ad_id: adId,
      ad_url: row.ad_url ?? `https://www.facebook.com/ads/library/?id=${adId}`,
      spend_estime_eur: row.spend_estime_eur,
      spend_jour_eur: row.spend_jour_eur,
      prev_spend_jour_eur: known ?? null,
      jours_diffusion: row.jours_diffusion,
      reach: row.reach ?? null,
      first_seen: row.first_seen ?? null,
      updated_at: now,
    };
  });

  const { error } = await c.from("ads").upsert(payload, { onConflict: "shop_id,ad_id" });
  if (error) return 0;
  return payload.length;
}
