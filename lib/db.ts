import fs from "node:fs";
import path from "node:path";
import type { Ad, Competitor, DbShape, Shop } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

/** Donnees de demonstration (matche le mockup valide avec Colin). */
function seed(): DbShape {
  const now = "2026-06-15T08:12:00.000Z";
  const shops: Shop[] = [{ id: 1, name: "Marco Moretti", created_at: now }];
  const competitors: Competitor[] = [
    { id: 1, shop_id: 1, name: "Meller", facebook_page_id: "1415151682063242", active: true },
    { id: 2, shop_id: 1, name: "Explicit Poets", facebook_page_id: "940295872786782", active: true },
    { id: 3, shop_id: 1, name: "Aura Eyes", facebook_page_id: "271725556034437", active: true },
  ];
  // competitor, ad_id, spend_jour, cumule, prev_spend_jour, jours, reach
  const raw: Array<[string, string, number, number, number | null, number, number, boolean]> = [
    ["Meller", "120218400111", 2100, 84000, 2000, 41, 9333333, true],
    ["Aura Eyes", "120218400222", 1850, 13000, null, 7, 1444444, false],
    ["Meller", "120218400333", 1600, 35000, 1500, 22, 3888888, false],
    ["Explicit Poets", "120218400444", 1320, 9200, 550, 14, 1022222, true],
    ["Meller", "120218400555", 1180, 5900, null, 5, 655555, false],
    ["Aura Eyes", "120218400666", 980, 41000, 950, 52, 4555555, false],
    ["Explicit Poets", "120218400777", 870, 6100, 414, 9, 677777, false],
    ["Meller", "120218400888", 760, 28500, 740, 38, 3166666, false],
    ["Aura Eyes", "120218400999", 640, 3800, null, 6, 422222, false],
    ["Explicit Poets", "120218401010", 590, 19700, 580, 34, 2188888, false],
  ];
  const ads: Ad[] = raw.map((r, i) => ({
    id: i + 1,
    shop_id: 1,
    competitor: r[0],
    ad_id: r[1],
    ad_url: `https://www.facebook.com/ads/library/?id=${r[1]}`,
    spend_jour_eur: r[2],
    spend_estime_eur: r[3],
    prev_spend_jour_eur: r[4],
    jours_diffusion: r[5],
    reach: r[6],
    suivi: r[7],
    first_seen: null,
    updated_at: now,
  }));
  return { shops, competitors, ads, meta: { lastSeq: 100, updatedAt: now } };
}

function read(): DbShape {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const s = seed();
    fs.writeFileSync(DB_PATH, JSON.stringify(s, null, 2), "utf8");
    return s;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as DbShape;
}

function write(db: DbShape): void {
  db.meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function nextId(db: DbShape): number {
  db.meta.lastSeq += 1;
  return db.meta.lastSeq;
}

// ---- shops ----
export function listShops(): Shop[] {
  return read().shops;
}
export function getShop(id: number): Shop | undefined {
  return read().shops.find((s) => s.id === id);
}
export function addShop(name: string): Shop {
  const db = read();
  const shop: Shop = { id: nextId(db), name, created_at: new Date().toISOString() };
  db.shops.push(shop);
  write(db);
  return shop;
}

// ---- competitors ----
export function listCompetitors(shopId: number): Competitor[] {
  return read().competitors.filter((c) => c.shop_id === shopId);
}
export function listActiveCompetitors(shopId: number): Competitor[] {
  return read().competitors.filter((c) => c.shop_id === shopId && c.active);
}
export function addCompetitor(shopId: number, name: string, fbPageId: string, note?: string): Competitor {
  const db = read();
  const c: Competitor = { id: nextId(db), shop_id: shopId, name, facebook_page_id: fbPageId, active: true, note: note ?? null };
  db.competitors.push(c);
  write(db);
  return c;
}
export function setCompetitorActive(id: number, active: boolean): void {
  const db = read();
  const c = db.competitors.find((x) => x.id === id);
  if (c) {
    c.active = active;
    write(db);
  }
}
export function deleteCompetitor(id: number): void {
  const db = read();
  db.competitors = db.competitors.filter((x) => x.id !== id);
  write(db);
}

// ---- ads ----
export function listAds(shopId: number): Ad[] {
  return read().ads.filter((a) => a.shop_id === shopId);
}
export function toggleSuivi(shopId: number, adId: string): void {
  const db = read();
  const a = db.ads.find((x) => x.shop_id === shopId && x.ad_id === adId);
  if (a) {
    a.suivi = !a.suivi;
    write(db);
  }
}
export function lastUpdated(shopId: number): string | null {
  const ads = listAds(shopId);
  if (ads.length === 0) return null;
  return ads.reduce((m, a) => (a.updated_at > m ? a.updated_at : m), ads[0].updated_at);
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
export function upsertAds(shopId: number, rows: AdInput[]): number {
  const db = read();
  const now = new Date().toISOString();
  let count = 0;
  for (const row of rows) {
    const adId = String(row.ad_id);
    const existing = db.ads.find((a) => a.shop_id === shopId && a.ad_id === adId);
    if (existing) {
      existing.prev_spend_jour_eur = existing.spend_jour_eur;
      existing.competitor = row.competitor;
      existing.spend_estime_eur = row.spend_estime_eur;
      existing.spend_jour_eur = row.spend_jour_eur;
      existing.jours_diffusion = row.jours_diffusion;
      if (row.reach != null) existing.reach = row.reach;
      if (row.ad_url) existing.ad_url = row.ad_url;
      existing.updated_at = now;
    } else {
      db.ads.push({
        id: nextId(db),
        shop_id: shopId,
        competitor: row.competitor,
        ad_id: adId,
        ad_url: row.ad_url ?? `https://www.facebook.com/ads/library/?id=${adId}`,
        spend_estime_eur: row.spend_estime_eur,
        spend_jour_eur: row.spend_jour_eur,
        prev_spend_jour_eur: null,
        jours_diffusion: row.jours_diffusion,
        reach: row.reach ?? null,
        suivi: false,
        first_seen: row.first_seen ?? null,
        updated_at: now,
      });
    }
    count += 1;
  }
  write(db);
  return count;
}
