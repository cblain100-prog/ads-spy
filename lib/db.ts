import fs from "node:fs";
import path from "node:path";
import type { Ad, Competitor, DbShape, Shop } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

/**
 * Donnees de demonstration (boutique Marco Moretti, ~56 pubs) pour que le top 50
 * soit peuple direct. Genere de facon deterministe : meme rendu a chaque reseed.
 */
function seed(): DbShape {
  const base = "2026-06-15T08:12:00.000Z";
  const compDefs = [
    { name: "Meller", fb: "1415151682063242" },
    { name: "Explicit Poets", fb: "940295872786782" },
    { name: "Aura Eyes", fb: "271725556034437" },
    { name: "Komono", fb: "176453135730245" },
    { name: "Hawkers", fb: "482154035180973" },
  ];
  const competitors: Competitor[] = compDefs.map((c, i) => ({
    id: i + 1,
    shop_id: 1,
    name: c.name,
    facebook_page_id: c.fb,
    active: true,
    note: null,
  }));

  const pattern = [0, 1, 0, 2, 0, 3, 1, 0, 4, 2, 0, 1, 3, 0, 2, 4];
  const N = 56;
  const ads: Ad[] = [];
  for (let i = 0; i < N; i++) {
    const spendJour = Math.max(60, Math.round(3000 * Math.pow(0.94, i)));
    const compDef = compDefs[pattern[i % pattern.length]];
    const comp = compDef.name;
    const r = i % 7;
    const days = r === 0 ? 4 : r === 1 ? 6 : r === 2 ? 12 : 24 + ((i * 11) % 66);
    // ~1/3 des pubs scalent, avec une acceleration variee (x10 a x2) pour la demo
    const accelChoices = [10, 7, 5, 4, 3, 2.5, 2];
    let prev: number | null = null;
    if (i % 3 === 1) {
      const a = accelChoices[Math.floor(i / 3) % accelChoices.length];
      prev = Math.max(1, Math.round(spendJour / a));
    } else if (i % 5 === 0) {
      prev = Math.round(spendJour * 0.95); // stable, pas scale
    }
    const cumule = Math.round(spendJour * days * 0.55);
    const reach = Math.round((cumule / 9) * 1000);
    const adId = `12021840${1000 + i}`;
    ads.push({
      id: i + 1,
      shop_id: 1,
      competitor: comp,
      ad_id: adId,
      // demo : lien vers la vraie page Ad Library du concurrent (les ad-ids de demo sont fictifs).
      // avec les vraies donnees de la routine, ad_url pointera sur la crea precise.
      ad_url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=FR&view_all_page_id=${compDef.fb}`,
      spend_jour_eur: spendJour,
      spend_estime_eur: cumule,
      prev_spend_jour_eur: prev,
      jours_diffusion: days,
      reach,
      suivi: i === 0 || i === 3 || i === 9,
      first_seen: null,
      updated_at: base,
    });
  }
  return {
    shops: [{ id: 1, name: "Marco Moretti", created_at: base }],
    competitors,
    ads,
    meta: { lastSeq: 200, updatedAt: base },
  };
}

/** Lecture resiliente : marche en local (persiste) ET sur un FS read-only type Vercel (reseed memoire). */
function read(): DbShape {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as DbShape;
    }
  } catch {
    // fichier illisible -> on repart du seed
  }
  const s = seed();
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(s, null, 2), "utf8");
  } catch {
    // FS read-only (ex: Vercel) -> on sert le seed en memoire, pas de persistance
  }
  return s;
}

function write(db: DbShape): void {
  db.meta.updatedAt = new Date().toISOString();
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // FS read-only -> ecriture ignoree (demo non persistante)
  }
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
